My name is Daniel. I am a passionate cybersecurity enthusiast, actively diving into the offensive security world since 2019.

This space is my personal notebook where I document my journey and share technical breakdowns. Over the years, I have spent countless hours hunting for bugs in Bug Bounty programs and powning boxes on platforms like Hack The Box (HTB) and TryHackMe (THM).

I created this blog to share my experience, post step-by-step write-ups of various machines, and connect with other tech-minded people.

Feel free to look around. Stay ethical. Happy hacking.

---

### Recent Writeups

<ul>
  {% for post in site.posts %}
    <li>
      <strong><a href="{{ post.url | relative_url }}">{{ post.title }}</a></strong> 
      <span style="color: #586069; font-size: 0.85em; margin-left: 10px;">— {{ post.date | date: "%B %d, %Y" }}</span>
    </li>
  {% endfor %}
</ul>
