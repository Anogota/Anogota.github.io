---
layout: default
title: AD Methodology
permalink: /AD_metodology/
---

# Active Directory Attack Methodology

A field-tested, exam-ready compendium of Active Directory attack vectors for **CPTS (HackTheBox)** and **OSCP** preparation. Every module follows the same rigorous structure: **pre-requisites → theory & mechanics → exact step-by-step commands → complete attack chain** from initial foothold to full domain compromise.

<div class="callout info">
  <span class="callout-title">How to use this compendium</span>
  Start with the <strong>Overview & Methodology</strong> to understand the kill-chain, then drill into each vector. Commands assume a Kali/Parrot attacker box. Replace <code>DOMAIN.LOCAL</code>, <code>DC01</code>, IPs and credentials with your target values. Every module includes realistic tool output and screenshot placeholders so you can map the procedure to your own lab.
</div>

<div class="ad-grid">
  {% assign docs = site.AD_metodology | sort: "order" %}
  {% for doc in docs %}
    {% unless doc.url contains "/AD_metodology/index" %}
    <a class="ad-card" href="{{ doc.url | relative_url }}">
      <span class="ad-num">{% if doc.order %}{{ doc.order | prepend: "0" | slice: -2, 2 }}{% endif %} · {{ doc.phase | default: "AD" }}</span>
      <span class="ad-title">{{ doc.title }}</span>
      <span class="ad-desc">{{ doc.summary }}</span>
      <span class="ad-tag">{{ doc.tactic | default: "Active Directory" }} &rarr;</span>
    </a>
    {% endunless %}
  {% endfor %}
</div>

---

 ### Domain Compromise Kill-Chain (Quick Map)

| Phase | Technique | Primary Tools | Output |
|-------|-----------|---------------|--------|
| Recon / Enum | User & host enumeration | Kerbrute, nmap, ldapsearch, NetExec | valid usernames, hosts |
| Credential Access | AS-REP Roasting | impacket-GetNPUsers, hashcat | crackable AS-REP hashes |
| Credential Access | Kerberoasting | impacket-GetUserSPNs, hashcat | crackable TGS hashes |
| Recon / Analysis | Attack-path mapping | BloodHound, SharpHound | graph of privesc paths |
| Privilege Escalation | ACL / DACL abuse | PowerView, bloodyAD, Certipy | control over principals |
| Privilege Escalation | AD CS abuse (ESC1–ESC8) | Certipy, ntlmrelayx | forged / privileged certs |
| Lateral Movement | PtH / PtT / OverPtH | NetExec, impacket, evil-winrm | remote code exec |
| Domain Dominance | DCSync | impacket-secretsdump, mimikatz | krbtgt / all hashes |
| Persistence | Golden / Silver / Diamond Ticket | ticketer, mimikatz | forged TGT/TGS |

<div class="callout warning">
  <span class="callout-title">Legal & scope reminder</span>
  These techniques are for authorised engagements, CTFs and lab environments only (HTB, PG, TryHackMe, your own lab). Never run them against systems you do not have explicit written permission to test.
</div>
