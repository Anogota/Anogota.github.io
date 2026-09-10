---
layout: default
title: PortSwigger Writeups
permalink: /tryhackme/
---

## Welcome to my blog.

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
