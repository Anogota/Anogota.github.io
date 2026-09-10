---
layout: default
title: Home
---

## Welcome to my blog.

This space serves as my personal cyber security notebook where I document my journey, share technical breakdowns, and post step-by-step writeups of various machines. 

Over the years, I have spent countless hours hunting for bugs in Bug Bounty programs and powning boxes on platforms like Hack The Box (HTB) and TryHackMe (THM). Active in the offensive security world since 2019.

Feel free to look around. Stay ethical. Happy hacking.

---

<style>
  .platform-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 15px;
    margin: 25px 0;
  }

  .platform-card {
    background-color: #181818;
    border: 1px solid #333;
    border-radius: 6px;
    padding: 15px;
    text-align: center;
    text-decoration: none;
    color: inherit;
    transition: transform 0.2s ease, border-color 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .platform-card:hover {
    transform: translateY(-3px);
    border-color: #17a2b8;
  }

  .platform-card img {
    max-height: 50px;
    width: auto;
    object-fit: contain;
    margin-bottom: 10px;
  }

  .platform-card span {
    color: #17a2b8;
    font-weight: bold;
    font-size: 0.95rem;
  }
</style>

<div class="platform-grid">
  <!-- Link do folderu PortSwigger -->
  <a href="/portswigger/" class="platform-card">
    <img src="/assets/images/images.png" alt="PortSwigger">
    <span>PortSwigger</span>
  </a>

  <!-- Link do folderu Hack The Box -->
  <a href="/hackthebox/" class="platform-card">
    <img src="/assets/images/0x0.png" alt="Hack The Box">
    <span>Hack The Box</span>
  </a>

  <!-- Link do folderu TryHackMe -->
  <a href="/tryhackme/" class="platform-card">
    <img src="/assets/images/1747133102751.png" alt="TryHackMe">
    <span>TryHackMe</span>
  </a>
</div>

### Recent Writeups

<div class="posts-list" style="margin-top: 25px;">
  {% for post in site.posts %}
    <div class="post-item" style="margin-bottom: 30px; border-bottom: 1px solid #333; padding-bottom: 20px;">
      <h4 style="margin-bottom: 5px; font-size: 1.3em;">
        <a href="{{ post.url | relative_url }}" style="color: #00adb5; font-weight: 600;">{{ post.title }}</a>
      </h4>
      <div class="post-meta" style="color: #888; font-size: 0.85em; margin-bottom: 10px;">
        <span>Published on {{ post.date | date: "%B %d, %Y" }}</span>
      </div>
      <div class="post-excerpt" style="color: #ccc; line-height: 1.6; font-size: 0.95em;">
        {% if post.excerpt %}
          {{ post.excerpt | strip_html | truncatewords: 30 }}
        {% else %}
          Open this writeup to read the full walkthrough, initial access strategy, and privilege escalation steps for this machine.
        {% endif %}
      </div>
    </div>
  {% endfor %}
</div>
