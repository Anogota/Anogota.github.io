---
layout: default
title: AD_metodology
permalink: /AD_metodology/
---

<div class="ad-hub" data-testid="hub-page">
  <h1>AD_metodology</h1>
  <p class="ad-hub-intro">
    Terminalowe kompendium wektorów Active Directory pod CPTS. Wypełnij zmienne w top-barze (<code>$DC_IP</code>, <code>$DOMAIN</code>, <code>$USER</code>…) — wszystkie komendy w bloku <code>cmd</code> na wszystkich stronach automatycznie się podmieniają. <code>copy</code> kopiuje wersję z wartościami. Zmienne trzymane w <code>localStorage</code> per box (input <em>box</em> w top-barze). Export/import do przenoszenia kontekstu.
  </p>

  {% assign sections = "recon,kerberos,acl,adcs,delegation,lateral,dominance,bloodhound" | split: "," %}
  {% for section in sections %}
    {% assign items = site.ad_vectors | where: "category", section | sort: "order" %}
    {% if items.size > 0 %}
    <section class="hub-section" data-testid="hub-section-{{ section }}">
      <h2>{{ section }}</h2>
      <ul class="hub-section-list">
        {% for item in items %}
        <li class="hub-item" data-testid="hub-item-{{ item.slug }}">
          <a href="{{ item.url | relative_url }}">{{ item.title }}</a>
          <div class="hub-item-meta">
            {% if item.tools %}{% for t in item.tools %}<span>{{ t }}</span>{% unless forloop.last %} · {% endunless %}{% endfor %}{% endif %}
            <span class="progress-bar" data-progress-slug="{{ item.slug }}" data-progress-total="{{ item.progress_total | default: 5 }}">
              <span class="progress-track"><span class="progress-fill"></span></span>
              <span class="progress-label">0 / {{ item.progress_total | default: 5 }}</span>
            </span>
          </div>
        </li>
        {% endfor %}
      </ul>
    </section>
    {% endif %}
  {% endfor %}

  <section class="hub-section" data-testid="hub-quick-links">
    <h2>next steps</h2>
    <ul class="hub-section-list">
      <li class="hub-item"><a href="{{ '/AD_metodology/chain/' | relative_url }}">→ attack chain (graf + timeline + sugestie)</a></li>
      <li class="hub-item"><a href="https://github.com/Anogota/Anogota.github.io" rel="noopener">→ repo źródłowe (PR mile widziane)</a></li>
    </ul>
  </section>
</div>
