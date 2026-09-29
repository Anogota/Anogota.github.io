---
layout: default
title: "Overview & AD Attack Methodology"
order: 0
phase: "RECON"
tactic: "Methodology"
summary: "The complete mental model: enumeration workflow, the domain-compromise kill-chain, tooling matrix and how every module fits together."
---

{% include ad_nav.html %}

# Overview & Active Directory Attack Methodology

This module is the connective tissue for the whole compendium. It gives you a repeatable methodology so that on an exam (OSCP/CPTS) or CTF you never stare at a blank prompt after landing your first set of domain credentials.

## Threat Model & Terminology

Active Directory (AD) is Microsoft's directory service. A **forest** is the top security boundary; it contains one or more **domains**; domains contain **Organizational Units (OUs)**, **users**, **computers**, **groups** and **Group Policy Objects (GPOs)**. Domain Controllers (DCs) host the `NTDS.dit` database (all secrets) and run **Kerberos** (KDC) + **LDAP** + **SMB** + **DNS**.

<div class="badges">
  <span class="badge">SID</span>
  <span class="badge">RID</span>
  <span class="badge">SPN</span>
  <span class="badge">TGT / TGS</span>
  <span class="badge">NTLM hash</span>
  <span class="badge">Kerberos AES key</span>
  <span class="badge">krbtgt</span>
  <span class="badge">DACL / ACE</span>
</div>

| Term | Meaning |
|------|---------|
| **SID** | Security Identifier, unique per principal (`S-1-5-21-<domain>-<RID>`) |
| **RID** | Relative ID; the tail of the SID (e.g. `512` = Domain Admins, `500` = built-in Administrator) |
| **SPN** | Service Principal Name; ties a service to an account, enables Kerberoasting |
| **TGT** | Ticket Granting Ticket, encrypted with the `krbtgt` key |
| **TGS** | Service ticket, encrypted with the target service account's key |
| **NTLM hash** | MD4 of the UTF-16 password; usable directly via Pass-the-Hash |
| **DACL** | Discretionary ACL; the list of ACEs that grant rights over an object |

## The Domain-Compromise Kill-Chain

Every AD engagement follows the same loop. You repeat **Enumerate → Access → Escalate → Move** until you own the domain.

```terminal
[ 0 ] External / Initial Access ─── phishing, exposed service, weak creds, LLMNR/NBNS poisoning
        │
[ 1 ] Recon (unauth)          ─── nmap, Kerbrute user enum, ldapsearch anon, RID cycling
        │
[ 2 ] Credential Access       ─── AS-REP Roasting  →  Kerberoasting  →  spraying
        │
[ 3 ] Situational Awareness   ─── BloodHound / SharpHound  (map the graph)
        │
[ 4 ] Privilege Escalation    ─── ACL/DACL abuse  |  AD CS ESC1-ESC8  |  GPO abuse
        │
[ 5 ] Lateral Movement        ─── PtH / OverPtH / PtT  →  WinRM / SMB / WMI / RDP
        │
[ 6 ] Domain Dominance        ─── DCSync (dump krbtgt + all hashes)
        │
[ 7 ] Persistence             ─── Golden / Silver / Diamond Ticket, cert-based persistence
```

## Phase 1 — Unauthenticated Enumeration

Before any credentials, enumerate everything the network hands you for free.

```bash
# Identify the DC and open services
export DC=10.10.10.100
export DOMAIN=corp.local
sudo nmap -Pn -p 53,88,135,139,389,445,464,636,3268,3269,5985,9389 -sV $DC

# DNS / domain name discovery
nslookup -type=SRV _ldap._tcp.dc._msdcs.$DOMAIN $DC

# Anonymous LDAP (naming context + sometimes users)
ldapsearch -x -H ldap://$DC -s base namingcontexts
ldapsearch -x -H ldap://$DC -b "DC=corp,DC=local" '(objectClass=user)' sAMAccountName

# SMB null session + RID cycling to harvest usernames
nxc smb $DC -u '' -p '' --rid-brute 10000
enum4linux-ng -A $DC
```

<div class="callout tip">
  <span class="callout-title">TIP — Time sync</span>
  Kerberos rejects requests with more than ~5 minutes clock skew (KRB_AP_ERR_SKEW). Always sync to the DC first: <code>sudo ntpdate $DC</code> or <code>sudo rdate -n $DC</code>. This single step fixes the majority of "why is my Kerberoast failing" issues.
</div>

## Phase 2 — Credential Access (order of operations)

1. **Kerbrute** — validate/enumerate usernames, then a careful password spray. → [Kerbrute Enumeration](/AD_metodology/kerbrute-enumeration/)
2. **AS-REP Roasting** — pull hashes for accounts with pre-auth disabled (no creds needed). → [AS-REP Roasting](/AD_metodology/asrep-roasting/)
3. **Kerberoasting** — with any valid credential, request TGS for SPN accounts and crack offline. → [Kerberoasting](/AD_metodology/kerberoasting/)

## Phase 3 — Situational Awareness with BloodHound

The moment you have one valid credential, collect and analyse the graph. BloodHound turns thousands of ACEs into a clickable shortest-path-to-Domain-Admins. → [BloodHound Enumeration](/AD_metodology/bloodhound-enumeration/)

## Phase 4-7 — Escalate, Move, Dominate, Persist

- **ACL / DACL abuse** (GenericAll, WriteDacl, WriteOwner, ...) → [ACL / DACL Abuse](/AD_metodology/acl-dacl-abuse/)
- **AD CS** full ESC1–ESC8 cycle → [AD CS ESC1–ESC8](/AD_metodology/adcs-esc1-esc8/)
- **Lateral Movement** (PtH / PtT / OverPtH / relay) → [Lateral Movement](/AD_metodology/lateral-movement/)
- **DCSync & Golden Ticket** → [DCSync / Golden Ticket](/AD_metodology/dcsync-golden-ticket/)

## Universal Tooling Matrix

<div class="badges">
  <span class="badge tool">NetExec (nxc)</span>
  <span class="badge tool">Impacket</span>
  <span class="badge tool">Certipy</span>
  <span class="badge tool">BloodHound</span>
  <span class="badge tool">Kerbrute</span>
  <span class="badge tool">Hashcat</span>
  <span class="badge tool">evil-winrm</span>
  <span class="badge tool">PowerView</span>
  <span class="badge tool">mimikatz / Rubeus</span>
  <span class="badge tool">ligolo-ng / chisel</span>
</div>

```bash
# Quick install sanity-check on Kali
nxc --version                  # NetExec (successor to CrackMapExec)
impacket-GetUserSPNs -h        # Impacket suite (apt install python3-impacket / pipx)
certipy-ad version             # AD CS abuse
kerbrute -h                    # user enum + spraying
hashcat --version
evil-winrm --version
```

<div class="callout opsec">
  <span class="callout-title">OPSEC note</span>
  On real engagements, Kerberoasting/AS-REP with weak (RC4/etype 23) tickets, DCSync, and Golden Tickets are all heavily monitored (Event IDs 4769, 4662, 4768). For exams this rarely matters, but each module flags the detections so you build the right habits.
</div>

## Credential Cheat-Sheet: what unlocks what

| You have | You can do |
|----------|-----------|
| Username list only | Kerbrute enum, AS-REP Roast (if pre-auth disabled) |
| One valid password/hash | Kerberoast, BloodHound, LDAP enum, spray other users |
| NTLM hash | Pass-the-Hash, OverPass-the-Hash → TGT, DCSync (if privileged) |
| Kerberos TGT (.ccache) | Pass-the-Ticket, request TGS to any service |
| Local admin on a host | dump LSASS/SAM, harvest cached creds & tickets |
| DA / DCSync rights | dump krbtgt → Golden Ticket → full persistence |

{% include toc_sidebar.html %}
