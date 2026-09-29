---
layout: default
title: PortSwigger Writeups
permalink: /portswigger/
---

# PortSwigger — Web Security Academy

Writeups and notes from the PortSwigger Web Security Academy labs.

<div class="writeups-list">
  {% for post in site.posts %}
    {% if post.categories contains 'portswigger' or post.tags contains 'portswigger' %}
      {% assign os = post.box_os | downcase %}
      {% assign diff = post.box_difficulty | downcase %}
      <article class="writeup-card">
        <div class="wc-body">
          <h3 class="wc-title"><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
          <div class="wc-meta">
            <span class="wc-chip date">{{ post.date | date: "%b %d, %Y" }}</span>
            {% if post.box_difficulty %}<span class="wc-chip diff-{{ diff }}">{{ post.box_difficulty }}</span>{% endif %}
          </div>
          <div class="wc-excerpt">
            {% if post.excerpt %}{{ post.excerpt | strip_html | truncatewords: 45 }}{% else %}Open this writeup to read the full walkthrough.{% endif %}
          </div>
        </div>
        <img class="wc-thumb" src="{{ post.box_image | default: '/assets/images/machines/default.png' | relative_url }}" alt="{{ post.title }} icon" loading="lazy">
      </article>
    {% endif %}
  {% endfor %}
</div>
