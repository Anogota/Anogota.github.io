---
layout: default
title: Hack The Box Writeups
permalink: /hackthebox/
---

<section class="posts-0xdf htb-page" data-testid="htb-posts-list">
<h2 class="posts-0xdf-heading">HackTheBox</h2>

{% assign htb_posts = site.posts | where_exp: "p", "p.categories contains 'hackthebox'" %}
{% assign tagstr = "" %}
{% for p in htb_posts %}{% for t in p.tags %}{% assign tagstr = tagstr | append: t | append: "," %}{% endfor %}{% endfor %}
{% assign uniq_tags = tagstr | split: "," | uniq | sort %}

<div class="wu-toolbar">
  <input type="text" id="wu-search" class="wu-search" placeholder="Filter on name or tag…" autocomplete="off">
  <div class="wu-difficulties">
    <span class="wu-btn diff-btn active" data-diff="all">All</span>
    <span class="wu-btn diff-btn" data-diff="easy">Easy</span>
    <span class="wu-btn diff-btn" data-diff="medium">Medium</span>
    <span class="wu-btn diff-btn" data-diff="hard">Hard</span>
    <span class="wu-btn diff-btn" data-diff="insane">Insane</span>
  </div>
</div>

<div class="wu-tagcloud" id="wu-tagcloud">
  {% for t in uniq_tags %}<span class="wu-tagchip" data-tag="{{ t | downcase }}">{{ t }}</span>{% endfor %}
</div>

<div class="wu-count" id="wu-count"></div>

<div class="writeups-list" id="writeups-list">
  {% for post in htb_posts %}
  {% include post_entry.html filter_attrs=true %}
  {% endfor %}
</div>
</section>

<div class="wu-empty" id="wu-empty" style="display:none;">No machines match the current filters.</div>

<script>
(function () {
  const cards = Array.from(document.querySelectorAll('#writeups-list .p0-entry'));
  const search = document.getElementById('wu-search');
  const diffBtns = Array.from(document.querySelectorAll('.diff-btn'));
  const tagChips = Array.from(document.querySelectorAll('.wu-tagchip'));
  const countEl = document.getElementById('wu-count');
  const emptyEl = document.getElementById('wu-empty');
  let activeDiff = 'all';
  const activeTags = new Set();

  function apply() {
    const q = search.value.trim().toLowerCase();
    let shown = 0;
    cards.forEach(card => {
      const name = card.getAttribute('data-name') || '';
      const tags = card.getAttribute('data-tags') || '';
      const diff = card.getAttribute('data-diff') || '';
      const matchText = !q || name.includes(q) || tags.includes(q);
      const matchDiff = activeDiff === 'all' || diff === activeDiff;
      let matchTags = true;
      activeTags.forEach(t => { if (!tags.split(' ').includes(t)) matchTags = false; });
      const ok = matchText && matchDiff && matchTags;
      card.classList.toggle('wu-hidden', !ok);
      if (ok) shown++;
    });
    countEl.textContent = 'Showing ' + shown + ' of ' + cards.length + ' machines';
    emptyEl.style.display = shown === 0 ? '' : 'none';
  }

  search.addEventListener('input', apply);
  diffBtns.forEach(b => b.addEventListener('click', () => {
    diffBtns.forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    activeDiff = b.getAttribute('data-diff');
    apply();
  }));
  tagChips.forEach(c => c.addEventListener('click', () => {
    const t = c.getAttribute('data-tag');
    if (activeTags.has(t)) { activeTags.delete(t); c.classList.remove('active'); }
    else { activeTags.add(t); c.classList.add('active'); }
    apply();
  }));
  apply();
})();
</script>
