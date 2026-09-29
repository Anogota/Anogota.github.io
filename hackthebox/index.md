---
layout: default
title: Hack The Box Writeups
permalink: /hackthebox/
---

# Hack The Box — Writeups

Step-by-step walkthroughs of retired HTB machines: enumeration, exploitation and privilege escalation.

<div class="writeups-list">
  {% for post in site.posts %}
    {% if post.categories contains 'hackthebox' or post.tags contains 'hackthebox' %}
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
            {% if post.excerpt %}{{ post.excerpt | strip_html | truncatewords: 45 }}{% else %}Open this writeup to read the full walkthrough.{% endif %}
          </div>
        </div>
        <img class="wc-thumb" src="{{ post.box_image | default: '/assets/images/machines/default.png' | relative_url }}" alt="{{ post.box | default: post.title }} machine icon" loading="lazy">
      </article>
    {% endif %}
  {% endfor %}
</div>
