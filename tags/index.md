---
layout: default
title: Tags
permalink: /tags/
---

# Tags

Browse writeups by tag — 0xdf-style. Click a tag in the cloud to jump to its section, or filter the cloud below.

<input type="text" id="tag-filter" class="search-box" placeholder="Filter tags…" autocomplete="off">

{% assign sorted_tags = site.tags | sort %}

<div class="wu-count">{{ sorted_tags | size }} tags</div>

<div class="tags-cloud" id="tags-cloud">
  {% for tag in sorted_tags %}
    <a href="#tag-{{ tag[0] | slugify }}" data-tag="{{ tag[0] | downcase }}">{{ tag[0] }}<span class="cnt">{{ tag[1] | size }}</span></a>
  {% endfor %}
</div>

<hr>

{% for tag in sorted_tags %}
<div class="tag-section" id="tag-{{ tag[0] | slugify }}">
  <h3>#{{ tag[0] }}</h3>
  <ul>
    {% assign posts = tag[1] | sort: "date" | reverse %}
    {% for post in posts %}
      <li><span class="li-date">{{ post.date | date: "%b %d, %Y" }}</span><a href="{{ post.url | relative_url }}">{{ post.title }}</a></li>
    {% endfor %}
  </ul>
</div>
{% endfor %}

<script>
(function () {
  const filter = document.getElementById('tag-filter');
  const chips = Array.from(document.querySelectorAll('#tags-cloud a'));
  filter.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    chips.forEach(c => { c.style.display = c.getAttribute('data-tag').includes(q) ? '' : 'none'; });
  });
})();
</script>
