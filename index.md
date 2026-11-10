---
layout: default
title: Home
---

<nav class="platform-links" data-testid="platform-links-bar">
  <a class="pl-htb" href="{{ '/hackthebox/' | relative_url }}" data-testid="platform-link-htb">HackTheBox</a>
  <span class="pl-sep">|</span>
  <a class="pl-ps" href="{{ '/portswigger/' | relative_url }}" data-testid="platform-link-portswigger">PortSwigger</a>
  <span class="pl-sep">|</span>
  <a class="pl-thm" href="{{ '/tryhackme/' | relative_url }}" data-testid="platform-link-tryhackme">TryHackMe</a>
</nav>


<style>
.latest-posts-section {
  margin-top: 40px;
  width: 100%;
}

.custom-posts-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
  margin-top: 20px !important;
}

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

.custom-post-card:hover {
  border-color: #00f2ff !important;
  box-shadow: 0 0 15px rgba(0, 242, 255, 0.3) !important;
  transform: translateY(-2px) !important;
  background: rgba(30, 30, 30, 0.9) !important;
}

.custom-post-info {
  display: flex !important;
  align-items: center !important;
  gap: 15px !important;
}

.custom-post-title {
  color: #ffffff !important;
  font-size: 1rem !important;
  font-weight: 600 !important;
  margin: 0 !important;
}

.custom-post-tag {
  font-size: 0.7rem !important;
  font-weight: bold !important;
  padding: 3px 8px !important;
  border-radius: 5px !important;
  text-transform: uppercase !important;
  white-space: nowrap !important;
}

.tag-portswigger {
  background: rgba(251, 146, 60, 0.15) !important;
  color: #fb923c !important;
  border: 1px solid #f97316 !important;
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

<section class="posts-0xdf" data-testid="posts-list">
  <h2 class="posts-0xdf-heading">Posts</h2>
  {% for post in site.posts %}
  <article class="p0-entry" data-testid="post-entry">
      <img class="p0-thumb" src="{{ post.box_image | default: '/assets/images/machines/default.png' | relative_url }}" alt="{{ post.box | default: post.title }} icon" loading="lazy">
    <div class="p0-date">{{ post.date | date: "%b %-d, %Y" }}</div>
    <h3 class="p0-title"><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
    <div class="p0-tags">
      <svg class="p0-tag-icon" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M1 7.8V2.5A1.5 1.5 0 0 1 2.5 1h5.3c.4 0 .8.2 1.1.4l6.2 6.2c.6.6.6 1.5 0 2.1l-5.3 5.3c-.6.6-1.5.6-2.1 0L1.4 8.9A1.5 1.5 0 0 1 1 7.8zM4.5 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/></svg>
      {% if post.box_os %}<a href="{{ '/tags/' | relative_url }}#tag-{{ post.box_os | slugify }}">{{ post.box_os | downcase }}</a>{% endif %}
      {% if post.box_difficulty %}<a href="{{ '/tags/' | relative_url }}#tag-{{ post.box_difficulty | slugify }}">{{ post.box_difficulty | downcase }}</a>{% endif %}
      {% for tag in post.tags %}<a href="{{ '/tags/' | relative_url }}#tag-{{ tag | slugify }}">{{ tag }}</a> {% endfor %}
    </div>
    <div class="p0-body">
      <p class="p0-excerpt">{% if post.excerpt %}{{ post.excerpt | strip_html | truncatewords: 60 }}{% else %}Open this writeup to read the full walkthrough.{% endif %}</p>
    </div>
  </article>
  {% endfor %}
</section>
