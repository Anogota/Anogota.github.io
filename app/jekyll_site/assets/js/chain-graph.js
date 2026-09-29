/* chain-graph.js — Cytoscape graph of AD attack states + rule engine
 * Nodes = states (Unauthenticated → Valid User → NT Hash → TGT → TGS → DA)
 * Edges = attack vectors (click → open vector page)
 * Node glow when corresponding $CTX variable is populated. */
(function () {
  "use strict";
  if (typeof cytoscape === "undefined") {
    console.warn("cytoscape not loaded");
    return;
  }

  var BASE = (document.querySelector('link[rel="stylesheet"]') || {}).href || "";
  BASE = BASE.replace(/\/assets\/css\/main\.css.*/, "");

  var STATES = [
    { id: "unauth",       label: "Unauthenticated",   need: [] },
    { id: "valid_user",   label: "Valid User",        need: ["USER"] },
    { id: "creds",        label: "User+Pass",         need: ["USER", "PASS"] },
    { id: "nt_hash",      label: "NT Hash",           need: ["NT_HASH"] },
    { id: "aes_key",      label: "AES Key",           need: ["AES_KEY"] },
    { id: "tgt",          label: "TGT",               need: [] },
    { id: "tgs",          label: "TGS",               need: [] },
    { id: "cert",         label: "Certificate (PFX)", need: [] },
    { id: "shadow_creds", label: "Shadow Creds",      need: [] },
    { id: "target_shell", label: "Target Shell",      need: ["TARGET_HOST"] },
    { id: "krbtgt",       label: "krbtgt Hash",       need: ["KRBTGT_HASH"] },
    { id: "domain_admin", label: "Domain Admin",      need: [] }
  ];

  var VECTORS = [
    { id: "kerbrute",       from: "unauth",       to: "valid_user",   label: "kerbrute userenum",     path: "kerbrute" },
    { id: "spray",          from: "valid_user",   to: "creds",        label: "passwordspray",         path: "kerbrute" },
    { id: "asrep",          from: "valid_user",   to: "nt_hash",      label: "AS-REP roasting",       path: "asrep-roasting" },
    { id: "kroast",         from: "creds",        to: "nt_hash",      label: "Kerberoasting",         path: "kerberoasting" },
    { id: "silver",         from: "nt_hash",      to: "target_shell", label: "Silver Ticket",         path: "silver-ticket" },
    { id: "pth",            from: "nt_hash",      to: "target_shell", label: "Pass-the-Hash",         path: "pass-the-hash" },
    { id: "overpass",       from: "nt_hash",      to: "tgt",          label: "Overpass-the-Hash",     path: "overpass-the-hash" },
    { id: "gettgt",         from: "creds",        to: "tgt",          label: "getTGT.py",             path: "pass-the-ticket" },
    { id: "s4u",            from: "tgt",          to: "tgs",          label: "S4U2self/proxy",        path: "constrained" },
    { id: "rbcd",           from: "creds",        to: "target_shell", label: "RBCD",                  path: "rbcd" },
    { id: "shadow",         from: "creds",        to: "shadow_creds", label: "Shadow Credentials",    path: "genericall-computer" },
    { id: "shadow_to_cert", from: "shadow_creds", to: "cert",         label: "PKINIT → cert",         path: "genericall-computer" },
    { id: "esc1",           from: "creds",        to: "cert",         label: "ADCS ESC1",             path: "esc1" },
    { id: "esc4",           from: "creds",        to: "cert",         label: "ADCS ESC4",             path: "esc4" },
    { id: "esc8",           from: "unauth",       to: "cert",         label: "ADCS ESC8 (relay)",     path: "esc8" },
    { id: "cert_to_nt",     from: "cert",         to: "nt_hash",      label: "UnPAC-the-Hash",        path: "esc1" },
    { id: "dcsync",         from: "domain_admin", to: "krbtgt",       label: "DCSync",                path: "dcsync" },
    { id: "dcsync_alt",     from: "nt_hash",      to: "krbtgt",       label: "DCSync (DA hash)",      path: "dcsync" },
    { id: "golden",         from: "krbtgt",       to: "domain_admin", label: "Golden Ticket",         path: "golden-ticket" },
    { id: "pth_da",         from: "nt_hash",      to: "domain_admin", label: "PtH (DA account)",      path: "pass-the-hash" }
  ];

  var cy;

  function loadCtx() { try { return JSON.parse(localStorage.getItem("ad_ctx")) || {}; } catch (e) { return {}; } }

  function nodeFilled(state, ctx) {
    if (state.need.length === 0) return false;
    return state.need.every(function (k) { return !!ctx[k]; });
  }

  function build() {
    var ctx = loadCtx();
    var elements = [];
    STATES.forEach(function (s) {
      elements.push({
        data: { id: s.id, label: s.label, filled: nodeFilled(s, ctx) ? "1" : "0", terminal: s.id === "domain_admin" ? "1" : "0" }
      });
    });
    VECTORS.forEach(function (v) {
      elements.push({ data: { id: v.id, source: v.from, target: v.to, label: v.label, path: v.path } });
    });

    cy = cytoscape({
      container: document.getElementById("chain-graph"),
      elements: elements,
      wheelSensitivity: 0.2,
      style: [
        { selector: "node", style: {
          "background-color": "#161b22",
          "border-color": "#30363d",
          "border-width": 1,
          "label": "data(label)",
          "color": "#c9d1d9",
          "text-valign": "center",
          "text-halign": "center",
          "font-family": "JetBrains Mono, Menlo, monospace",
          "font-size": 11,
          "width": "label",
          "height": 32,
          "padding": "10px",
          "shape": "round-rectangle"
        }},
        { selector: "node[filled = '1']", style: {
          "border-color": "#7ee787",
          "border-width": 2,
          "background-color": "#1c2b1e",
          "color": "#a5f3af",
          "shadow-blur": 20,
          "shadow-color": "#7ee787",
          "shadow-opacity": 0.6
        }},
        { selector: "node[terminal = '1']", style: {
          "border-color": "#f0b429",
          "color": "#f0b429"
        }},
        { selector: "edge", style: {
          "curve-style": "bezier",
          "target-arrow-shape": "triangle",
          "line-color": "#30363d",
          "target-arrow-color": "#30363d",
          "width": 1.5,
          "label": "data(label)",
          "color": "#8b949e",
          "font-family": "JetBrains Mono, Menlo, monospace",
          "font-size": 9,
          "text-background-color": "#0d1117",
          "text-background-opacity": 1,
          "text-background-padding": 2,
          "text-rotation": "autorotate"
        }},
        { selector: "edge:selected, edge:active", style: {
          "line-color": "#7ee787",
          "target-arrow-color": "#7ee787",
          "color": "#a5f3af",
          "width": 2
        }}
      ],
      layout: { name: "breadthfirst", directed: true, spacingFactor: 1.4, padding: 30 }
    });

    cy.on("tap", "edge", function (evt) {
      var path = evt.target.data("path");
      if (path) window.location.href = "/AD_metodology/" + path + "/";
    });

    cy.on("mouseover", "edge", function () { document.body.style.cursor = "pointer"; });
    cy.on("mouseout", "edge", function () { document.body.style.cursor = ""; });
  }

  function refreshHighlight() {
    if (!cy) return;
    var ctx = loadCtx();
    cy.nodes().forEach(function (n) {
      var s = STATES.filter(function (x) { return x.id === n.id(); })[0];
      if (s) n.data("filled", nodeFilled(s, ctx) ? "1" : "0");
    });
    updateSuggestions(ctx);
  }

  // Rule engine — reads ctx and suggests next vectors
  function updateSuggestions(ctx) {
    var list = document.getElementById("chain-suggestions");
    if (!list) return;
    var suggestions = [];
    if (ctx.NT_HASH) {
      suggestions.push({ path: "pass-the-hash",  title: "Pass-the-Hash",     reason: "$NT_HASH set → psexec/wmiexec/evil-winrm -H" });
      suggestions.push({ path: "overpass-the-hash", title: "Overpass-the-Hash", reason: "$NT_HASH → getTGT.py -hashes" });
      suggestions.push({ path: "dcsync",         title: "DCSync",             reason: "if $NT_HASH belongs to replication-privileged principal" });
    }
    if (ctx.USER && ctx.PASS) {
      suggestions.push({ path: "kerberoasting", title: "Kerberoasting",    reason: "creds set → GetUserSPNs.py -request" });
      suggestions.push({ path: "asrep-roasting", title: "AS-REP roasting", reason: "creds set → try -no-preauth users" });
      suggestions.push({ path: "genericall-computer", title: "Shadow Credentials", reason: "creds + GenericAll on computer" });
    }
    if (ctx.USER && !ctx.PASS) {
      suggestions.push({ path: "kerbrute",      title: "Password spraying", reason: "$USER without $PASS → spray common patterns" });
      suggestions.push({ path: "asrep-roasting", title: "AS-REP roasting", reason: "$USER may have DONT_REQ_PREAUTH" });
    }
    if (ctx.KRBTGT_HASH && ctx.DOMAIN_SID) {
      suggestions.push({ path: "golden-ticket", title: "Golden Ticket", reason: "$KRBTGT_HASH + $DOMAIN_SID → ticketer.py" });
    }
    if (ctx.CA_NAME && ctx.TEMPLATE) {
      suggestions.push({ path: "esc1", title: "ADCS ESC1", reason: "$CA_NAME + $TEMPLATE → certipy req" });
    }
    if (!suggestions.length) {
      list.innerHTML = '<li class="suggest-item"><span style="color:#8b949e">wypełnij kontekst żeby zobaczyć sugestie…</span></li>';
      return;
    }
    list.innerHTML = suggestions.map(function (s) {
      return '<li class="suggest-item" data-testid="suggest-' + s.path + '">' +
        '<a href="/AD_metodology/' + s.path + '/"><strong>' + s.title + '</strong>' +
        '<div class="suggest-reason">' + s.reason + '</div></a></li>';
    }).join("");
  }

  function renderTimeline() {
    var el = document.getElementById("chain-timeline-list");
    if (!el) return;
    var box = localStorage.getItem("ad_active_box") || "default";
    var events = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf("ad_progress_" + box + "_") === 0) {
        var slug = key.substring(("ad_progress_" + box + "_").length);
        var data;
        try { data = JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { data = {}; }
        var done = Object.keys(data).filter(function (k) { return data[k]; }).length;
        if (done) events.push({ slug: slug, done: done });
      }
    }
    if (!events.length) {
      el.innerHTML = '<li class="suggest-item"><span style="color:#8b949e">brak zaznaczonych kroków dla boxa: ' + box + '</span></li>';
      return;
    }
    el.innerHTML = events.map(function (e) {
      return '<li class="suggest-item"><a href="/AD_metodology/' + e.slug + '/"><strong>' + e.slug + '</strong>' +
        '<div class="suggest-reason">' + e.done + ' krok(ów) ukończonych</div></a></li>';
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", function () {
    build();
    refreshHighlight();
    renderTimeline();

    var fit = document.getElementById("chain-fit");
    if (fit) fit.addEventListener("click", function () { cy && cy.fit(null, 30); });

    var vGraph = document.getElementById("chain-view-graph");
    var vTL = document.getElementById("chain-view-timeline");
    var graphEl = document.getElementById("chain-graph");
    if (vGraph) vGraph.addEventListener("click", function () { graphEl.style.display = "block"; });
    if (vTL)    vTL.addEventListener("click",    function () { graphEl.style.display = "none";  });

    // Refresh on ctx changes
    window.addEventListener("storage", refreshHighlight);
    document.addEventListener("input", function (e) {
      if (e.target && e.target.classList && e.target.classList.contains("ad-field-input")) {
        setTimeout(refreshHighlight, 30);
      }
    });
  });
})();
