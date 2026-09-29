---
layout: default
title: "BloodHound — Enumeration & Attack-Path Analysis"
order: 8
phase: "ENUM"
tactic: "Situational Awareness"
summary: "Collect the AD graph with SharpHound/BloodHound.py and turn thousands of ACEs into a clickable shortest path to Domain Admins."
---

{% include ad_nav.html %}

# BloodHound — Enumeration & Attack-Path Analysis

## Pre-requisites

<div class="badges">
  <span class="badge req">Any valid domain credential (or hash / ticket)</span>
  <span class="badge req">LDAP 389/636 + SMB 445 reachable</span>
  <span class="badge req">BloodHound (CE or Legacy) + Neo4j</span>
</div>

## Mechanism & Theory

BloodHound models AD as a **graph**: nodes are users/groups/computers/GPOs/OUs/certificate templates; edges are relationships (`MemberOf`, `AdminTo`, `HasSession`, `GenericAll`, `CanRDP`, `ESC1`, ...). Attack paths that are invisible in a flat list of ACLs become an obvious chain when you ask *"shortest path to Domain Admins"*. Data is gathered by a **collector** (SharpHound on Windows, BloodHound.py/`nxc` remotely) into JSON, imported into Neo4j, and queried with pre-built or custom Cypher.

## Step-by-step

### 1. Collect remotely (no Windows needed)

```bash
export DC=10.10.10.100 ; export DOMAIN=corp.local
# BloodHound.py (Python collector)
bloodhound-python -u m.rossi -p 'Welcome2026!' -d $DOMAIN -ns $DC -c All --zip

# NetExec built-in collector
nxc ldap $DC -u m.rossi -p 'Welcome2026!' --bloodhound --collection All --dns-server $DC

# With a hash or Kerberos ticket instead of a password
bloodhound-python -u m.rossi --hashes :5f4dcc3b... -d $DOMAIN -ns $DC -c All --zip
bloodhound-python -k -no-pass -u m.rossi -d $DOMAIN -ns $DC -c All --zip
```

### 2. Collect from a Windows foothold (SharpHound)

```powershell
# Executable
.\SharpHound.exe -c All --zipfilename corp_loot
# In-memory (PowerShell)
Import-Module .\SharpHound.ps1 ; Invoke-BloodHound -CollectionMethod All -OutputDirectory C:\Windows\Temp
```

### 3. Import & analyse

```bash
# Start the stack (BloodHound CE via docker compose, or legacy neo4j + BloodHound GUI)
sudo neo4j start        # legacy
# Then drag-and-drop the *.zip / *.json into the BloodHound GUI
```

<div class="img-placeholder">
  <span class="ph-icon">🖼️</span>
  <span class="ph-label">SCREENSHOT PLACEHOLDER</span>
  <span class="ph-desc">BloodHound "Shortest Path to Domain Admins" graph with highlighted edges</span>
</div>

### 4. High-value pre-built queries

- Find all Domain Admins
- Shortest Paths to Domain Admins
- Shortest Path from Owned Principals
- Find Principals with DCSync Rights
- Find Computers where Domain Users are Local Admin
- Find Kerberoastable / AS-REP Roastable accounts
- Find workstations where Domain Users can RDP

### 5. Mark what you own & useful Cypher

```terminal
# Right-click your compromised principal -> "Mark as Owned"

# Custom Cypher: every outbound control edge from owned nodes
MATCH p=(o {owned:true})-[r:GenericAll|GenericWrite|WriteDacl|WriteOwner|ForceChangePassword|AddMember|AllExtendedRights]->(t) RETURN p

# Kerberoastable users with a path to DA
MATCH (u:User {hasspn:true}) MATCH p=shortestPath((u)-[*1..]->(g:Group {name:"DOMAIN ADMINS@CORP.LOCAL"})) RETURN p
```

## Complete Attack Chain (how BloodHound drives everything)

```terminal
[1] one credential ─► bloodhound-python -c All
[2] import ─► mark m.rossi as Owned
[3] "Shortest Path from Owned" reveals the exact chain, e.g.:
        m.rossi --ForceChangePassword--> svc_helpdesk --MemberOf--> Helpdesk Admins
        Helpdesk Admins --GenericAll--> DC01
[4] each edge maps to a module:
        ForceChangePassword ─► ACL/DACL Abuse
        SPN on a node        ─► Kerberoasting
        ESC1 edge            ─► AD CS ESC1..ESC8
        AdminTo / CanPSRemote ─► Lateral Movement
        DCSync edge          ─► DCSync / Golden Ticket
[5] execute edges in order ─► SYSTEM on DC ─► domain compromise
```

<div class="callout tip">
  <span class="callout-title">Exam workflow</span>
  The instant you get ANY credential: collect BloodHound, mark owned, run "Shortest Path from Owned". It converts guesswork into a deterministic checklist and is the single biggest time-saver on CPTS/OSCP AD boxes.
</div>

<div class="callout info">
  <span class="callout-title">CE vs Legacy</span>
  BloodHound Community Edition (BHCE) uses the newer <code>MATCH</code>-based analysis and supports AD CS (Certipy) edges (<code>ESC1</code>...). Legacy BloodHound 4.x still works well for classic ACL graphs. Either is fine for exams.
</div>

## Key Takeaways

- BloodHound = the map; every edge is a technique documented in the other modules.
- Collect early, mark owned, re-collect after each escalation to expose new paths.
- AD CS edges (ESC*) surface certificate-based escalation you would otherwise miss.

{% include toc_sidebar.html %}
