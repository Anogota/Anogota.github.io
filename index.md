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
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 20px;
    margin: 30px 0;
  }

  .platform-card {
    position: relative;
    aspect-ratio: 1 / 1; /* Wymusza idealny kwadrat */
    background-color: #121212;
    border: 1px solid #2a2a2a;
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Obrazki wypełniające kwadrat */
  .platform-card img {
    width: 100%;
    height: 100%;
    object-fit: cover; /* Dopasowuje i przycina grafikę, wypełniając cały kwadrat */
    transition: transform 0.3s ease, filter 0.3s ease;
  }

  /* Efekt Hover dla karty */
  .platform-card:hover {
    transform: translateY(-5px) scale(1.02);
    border-color: #17a2b8;
    box-shadow: 0 0 20px rgba(23, 162, 184, 0.4), 
                inset 0 0 10px rgba(23, 162, 184, 0.2);
  }

  /* Lekki efekt powiększenia obrazka wewnątrz po najechaniu */
  .platform-card:hover img {
    transform: scale(1.05);
    filter: brightness(1.1);
  }
</style>

<div class="platform-grid">
  <!-- PortSwigger -->
  <a href="/portswigger/" class="platform-card" title="PortSwigger Writeups">
    <img src="/assets/images/images.png" alt="PortSwigger">
  </a>

  <!-- Hack The Box -->
  <a href="/hackthebox/" class="platform-card" title="Hack The Box Writeups">
    <img src="/assets/images/0x0.png" alt="Hack The Box">
  </a>

  <!-- TryHackMe -->
  <a href="/tryhackme/" class="platform-card" title="TryHackMe Writeups">
    <img src="/assets/images/1747133102751.png" alt="TryHackMe">
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
