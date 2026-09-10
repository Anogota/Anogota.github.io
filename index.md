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
    <img src="/assets/images/PortSwigger.jpg" alt="PortSwigger">
  </a>

  <!-- Hack The Box -->
  <a href="/hackthebox/" class="platform-card" title="Hack The Box Writeups">
    <img src="/assets/images/HackTheBox.jpg" alt="Hack The Box">
  </a>

  <!-- TryHackMe -->
  <a href="/tryhackme/" class="platform-card" title="TryHackMe Writeups">
    <img src="/assets/images/TryHackMe.jpg" alt="TryHackMe">
  </a>
</div>

<section class="latest-posts-section">
  <h2 class="section-title">Ostatnie wpisy</h2>
  
  <div class="posts-list">
    {% for post in site.posts limit:5 %}
      <a href="{{ post.url | relative_url }}" class="post-card">
        <div class="post-info">
          {% if post.categories contains 'portswigger' %}
            <span class="post-tag tag-portswigger">PortSwigger</span>
          {% elsif post.categories contains 'hackthebox' %}
            <span class="post-tag tag-htb">Hack The Box</span>
          {% elsif post.categories contains 'tryhackme' %}
            <span class="post-tag tag-thm">TryHackMe</span>
          {% else %}
            <span class="post-tag">Writeup</span>
          {% endif %}
          <h3 class="post-title">{{ post.title }}</h3>
        </div>
        <div class="post-meta">
          <span class="post-date">{{ post.date | date: "%d.%m.%Y" }}</span>
          <span class="post-arrow">&rarr;</span>
        </div>
      </a>
    {% endfor %}
  </div>
</section>
