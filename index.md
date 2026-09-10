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

<!-- Tutaj zaczyna się sekcja ostatnich wpisów -->

<style>
/* Główna sekcja */
.latest-posts-section {
  margin-top: 40px;
  width: 100%;
}

/* Lista wpisów - układ w pionie */
.custom-posts-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
  margin-top: 20px !important;
}

/* Pojedynczy kafelek wpisu */
.custom-post-card {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  background: rgba(20, 20, 20, 0.8) !important;
  border: 1px solid rgba(0, 242, 255, 0.2) !important;
  border-radius: 10px !important;
  padding: 14px 20px !important;
  text-decoration: none !important;
  transition: all 0.25s ease-in-out !important;
}

/* Hover - rozświetlenie i delikatne uniesienie */
.custom-post-card:hover {
  border-color: #00f2ff !important;
  box-shadow: 0 0 15px rgba(0, 242, 255, 0.3) !important;
  transform: translateY(-2px) !important;
  background: rgba(30, 30, 30, 0.9) !important;
}

/* Lewa strona kafelka (Tag + Tytuł) */
.custom-post-info {
  display: flex !important;
  align-items: center !important;
  gap: 15px !important;
}

/* Tytuł wpisu */
.custom-post-title {
  color: #ffffff !important;
  font-size: 1rem !important;
  font-weight: 600 !important;
  margin: 0 !important;
}

/* Tagi kategorii */
.custom-post-tag {
  font-size: 0.7rem !important;
  font-weight: bold !important;
  padding: 3px 8px !important;
  border-radius: 5px !important;
  text-transform: uppercase !important;
  white-space: nowrap !important;
}

.tag-portswigger {
  background: rgba(139, 92, 246, 0.15) !important;
  color: #a78bfa !important;
  border: 1px solid #8b5cf6 !important;
}

.tag-htb {
  background: rgba(159, 239, 0, 0.15) !important;
  color: #9fef00 !important;
  border: 1px solid #9fef00 !important;
}

.tag-thm {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #ffffff !important;
  border: 1px solid #ffffff !important;
}

/* Prawa strona kafelka (Data + Strzałka) */
.custom-post-meta {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
}

.custom-post-date {
  color: #888888 !important;
  font-size: 0.85rem !important;
}

.custom-post-arrow {
  color: #00f2ff !important;
  font-size: 1.1rem !important;
  transition: transform 0.2s ease !important;
}

.custom-post-card:hover .custom-post-arrow {
  transform: translateX(4px) !important;
}

/* Responsywność dla ekranów mobilnych */
@media (max-width: 600px) {
  .custom-post-card {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 10px !important;
  }
  .custom-post-info {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 8px !important;
  }
  .custom-post-meta {
    width: 100% !important;
    justify-content: space-between !important;
  }
}
</style>

<section class="latest-posts-section">
  <h2 style="color: #fff; font-size: 1.4rem; border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 16px;">Recent posts</h2>
  
  <div class="custom-posts-list">
    {% for post in site.posts limit:5 %}
      <a href="{{ post.url | relative_url }}" class="custom-post-card">
        <div class="custom-post-info">
          {% if post.categories contains 'portswigger' %}
            <span class="custom-post-tag tag-portswigger">PortSwigger</span>
          {% elsif post.categories contains 'hackthebox' %}
            <span class="custom-post-tag tag-htb">Hack The Box</span>
          {% elsif post.categories contains 'tryhackme' %}
            <span class="custom-post-tag tag-thm">TryHackMe</span>
          {% else %}
            <span class="custom-post-tag tag-thm">Writeup</span>
          {% endif %}
          <h3 class="custom-post-title">{{ post.title }}</h3>
        </div>
        <div class="custom-post-meta">
          <span class="custom-post-date">{{ post.date | date: "%d.%m.%Y" }}</span>
          <span class="custom-post-arrow">&rarr;</span>
        </div>
      </a>
    {% endfor %}
  </div>
</section>
