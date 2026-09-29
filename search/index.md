---
layout: default
title: Search
permalink: /search/
---

# Content Search

Search across every writeup and the entire AD Methodology compendium — perfect for finding a command fast during an exam.

<input type="text" id="search-box" class="search-box" placeholder="Type a command, tool or keyword… e.g. GetUserSPNs, ESC1, secretsdump" autofocus autocomplete="off">

<div id="search-count" class="wu-count"></div>
<div id="search-results"></div>

<script>
(function () {
  const box = document.getElementById('search-box');
  const results = document.getElementById('search-results');
  const countEl = document.getElementById('search-count');
  let data = [];

  fetch('{{ "/search.json" | relative_url }}')
    .then(r => r.json())
    .then(j => { data = j; runFromHash(); })
    .catch(() => { countEl.textContent = 'Search index failed to load.'; });

  function esc(s) { return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  function snippet(content, q) {
    const idx = content.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return esc(content.slice(0, 160)) + '…';
    const start = Math.max(0, idx - 70);
    const end = Math.min(content.length, idx + q.length + 90);
    let s = esc(content.slice(start, end));
    const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    s = s.replace(re, '<mark>$1</mark>');
    return (start > 0 ? '…' : '') + s + (end < content.length ? '…' : '');
  }

  function search(q) {
    q = q.trim();
    results.innerHTML = '';
    if (q.length < 2) { countEl.textContent = 'Type at least 2 characters…'; return; }
    const ql = q.toLowerCase();
    const hits = data.filter(d =>
      (d.title && d.title.toLowerCase().includes(ql)) ||
      (d.content && d.content.toLowerCase().includes(ql)) ||
      (d.tags && d.tags.join(' ').toLowerCase().includes(ql))
    );
    countEl.textContent = hits.length + ' result' + (hits.length === 1 ? '' : 's') + ' for "' + q + '"';
    hits.forEach(d => {
      const a = document.createElement('a');
      a.className = 'search-result';
      a.href = d.url;
      a.innerHTML = '<span class="sr-title">' + esc(d.title) + '</span>' +
        '<span class="sr-type">' + (d.type === 'ad' ? 'AD Methodology' : 'Writeup') + '</span>' +
        '<div class="sr-snippet">' + snippet(d.content || '', q) + '</div>';
      results.appendChild(a);
    });
  }

  function runFromHash() {
    const q = decodeURIComponent((location.hash || '').replace(/^#q=/, ''));
    if (q) { box.value = q; search(q); }
  }

  let t;
  box.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => { search(box.value); location.hash = box.value ? 'q=' + encodeURIComponent(box.value) : ''; }, 150);
  });
})();
</script>
