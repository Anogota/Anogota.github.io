---
layout: default
title: Home
---

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

<section class="latest-posts-section">
  <h2 style="color: #fff; font-size: 1.4rem; border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 16px;">Recent posts</h2>
  
  <div class="writeups-list">
    {% for post in site.posts limit:5 %}
      {% assign os = post.box_os | downcase %}
      {% assign diff = post.box_difficulty | downcase %}
      <article class="writeup-card">
        <div class="wc-body">
          <h3 class="wc-title"><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
          <div class="wc-meta">
            <span class="wc-chip date">{{ post.date | date: "%b %d, %Y" }}</span>
            {% if post.box_os %}<span class="wc-chip os-{{ os }}">{{ post.box_os }}</span>{% endif %}
            {% if post.box_difficulty %}<span class="wc-chip diff-{{ diff }}">{{ post.box_difficulty }}</span>{% endif %}
          </div>
          <div class="wc-excerpt">
            {% if post.excerpt %}{{ post.excerpt | strip_html | truncatewords: 40 }}{% else %}Open this writeup to read the full walkthrough.{% endif %}
          </div>
        </div>
        <img class="wc-thumb" src="{{ post.box_image | default: '/assets/images/machines/default.png' | relative_url }}" alt="{{ post.box | default: post.title }} icon" loading="lazy">
      </article>
    {% endfor %}
  </div>
</section>
