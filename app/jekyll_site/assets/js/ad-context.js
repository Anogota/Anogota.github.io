/* ad-context.js — Global Target Context (localStorage + auto substitution + copy)
 * Vanilla JS. No inline. CSP-safe. */
(function () {
  "use strict";

  var CTX_KEY = "ad_ctx";
  var BOX_KEY = "ad_active_box";
  var MODE_KEY = "ad_ctx_mode"; // "values" | "placeholders"

  var FIELDS = [
    { k: "DC_IP",         ph: "10.10.10.10" },
    { k: "DC_HOST",       ph: "DC01" },
    { k: "DOMAIN",        ph: "corp" },
    { k: "DOMAIN_FQDN",   ph: "corp.htb" },
    { k: "USER",          ph: "svc_web" },
    { k: "PASS",          ph: "P@ssw0rd!" },
    { k: "NT_HASH",       ph: "aad3b4...:31d6cf..." },
    { k: "AES_KEY",       ph: "aes256 key" },
    { k: "TARGET_USER",   ph: "administrator" },
    { k: "TARGET_HOST",   ph: "SRV01" },
    { k: "CA_NAME",       ph: "corp-DC01-CA" },
    { k: "TEMPLATE",      ph: "User" },
    { k: "KRBTGT_HASH",   ph: "krbtgt NT hash" },
    { k: "DOMAIN_SID",    ph: "S-1-5-21-..." }
  ];

  function loadCtx() {
    try { return JSON.parse(localStorage.getItem(CTX_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveCtx(ctx) { localStorage.setItem(CTX_KEY, JSON.stringify(ctx)); }
  function getMode() { return localStorage.getItem(MODE_KEY) || "values"; }
  function setMode(m) { localStorage.setItem(MODE_KEY, m); }
  function getBox() { return localStorage.getItem(BOX_KEY) || "default"; }
  function setBox(b) { localStorage.setItem(BOX_KEY, b || "default"); }

  function substitute(str, ctx) {
    if (!str) return str;
    return str.replace(/\$([A-Z_]+)/g, function (m, name) {
      if (Object.prototype.hasOwnProperty.call(ctx, name) && ctx[name]) return ctx[name];
      return m;
    });
  }

  function renderTopBar() {
    var existing = document.getElementById("ad-topbar");
    if (existing) existing.remove();

    var bar = document.createElement("div");
    bar.id = "ad-topbar";
    bar.className = "ad-topbar";
    bar.setAttribute("data-testid", "ad-topbar");

    var head = document.createElement("div");
    head.className = "ad-topbar-head";
    head.innerHTML =
      '<span class="ad-topbar-title">[ target context ]</span>' +
      '<label class="ad-box-label">box: <input type="text" id="ad-box-input" class="ad-box-input" data-testid="ad-box-input" /></label>' +
      '<button type="button" id="ad-toggle-mode" class="ad-btn" data-testid="ad-toggle-mode">mode: values</button>' +
      '<button type="button" id="ad-toggle-collapse" class="ad-btn" data-testid="ad-toggle-collapse">collapse</button>' +
      '<button type="button" id="ad-export" class="ad-btn" data-testid="ad-export">export</button>' +
      '<button type="button" id="ad-import" class="ad-btn" data-testid="ad-import">import</button>' +
      '<button type="button" id="ad-clear" class="ad-btn ad-btn-danger" data-testid="ad-clear">clear</button>' +
      '<input type="file" id="ad-import-file" accept="application/json" style="display:none" />';
    bar.appendChild(head);

    var grid = document.createElement("div");
    grid.className = "ad-topbar-grid";
    grid.id = "ad-topbar-grid";
    var ctx = loadCtx();
    FIELDS.forEach(function (f) {
      var wrap = document.createElement("label");
      wrap.className = "ad-field";
      wrap.innerHTML =
        '<span class="ad-field-key">$' + f.k + '</span>' +
        '<input type="text" class="ad-field-input" data-key="' + f.k + '" data-testid="ad-field-' + f.k + '" placeholder="' + f.ph + '" />';
      grid.appendChild(wrap);
    });
    bar.appendChild(grid);

    document.body.insertBefore(bar, document.body.firstChild);

    // hydrate values
    document.getElementById("ad-box-input").value = getBox();
    Array.prototype.forEach.call(grid.querySelectorAll("input.ad-field-input"), function (inp) {
      var k = inp.getAttribute("data-key");
      if (ctx[k]) inp.value = ctx[k];
      inp.addEventListener("input", function () {
        var c = loadCtx();
        if (inp.value) c[k] = inp.value; else delete c[k];
        saveCtx(c);
        applySubstitution();
      });
    });

    document.getElementById("ad-box-input").addEventListener("change", function (e) {
      setBox(e.target.value);
      applyProgress();
    });

    var modeBtn = document.getElementById("ad-toggle-mode");
    modeBtn.textContent = "mode: " + getMode();
    modeBtn.addEventListener("click", function () {
      setMode(getMode() === "values" ? "placeholders" : "values");
      modeBtn.textContent = "mode: " + getMode();
      applySubstitution();
    });

    document.getElementById("ad-toggle-collapse").addEventListener("click", function () {
      grid.classList.toggle("collapsed");
    });

    document.getElementById("ad-export").addEventListener("click", function () {
      var blob = new Blob([JSON.stringify(loadCtx(), null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "ad_ctx_" + getBox() + ".json";
      document.body.appendChild(a); a.click(); a.remove();
    });

    var importFile = document.getElementById("ad-import-file");
    document.getElementById("ad-import").addEventListener("click", function () { importFile.click(); });
    importFile.addEventListener("change", function (e) {
      var file = e.target.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          saveCtx(data);
          Array.prototype.forEach.call(grid.querySelectorAll("input.ad-field-input"), function (inp) {
            inp.value = data[inp.getAttribute("data-key")] || "";
          });
          applySubstitution();
        } catch (err) { alert("bad json: " + err.message); }
      };
      reader.readAsText(file);
    });

    document.getElementById("ad-clear").addEventListener("click", function () {
      if (!confirm("clear target context?")) return;
      saveCtx({});
      Array.prototype.forEach.call(grid.querySelectorAll("input.ad-field-input"), function (inp) { inp.value = ""; });
      applySubstitution();
    });
  }

  function applySubstitution() {
    var ctx = loadCtx();
    var mode = getMode();
    var blocks = document.querySelectorAll("[data-cmd-raw]");
    Array.prototype.forEach.call(blocks, function (el) {
      var raw = el.getAttribute("data-cmd-raw");
      el.textContent = (mode === "values") ? substitute(raw, ctx) : raw;
    });
    highlightChain(ctx);
  }

  function highlightChain(ctx) {
    // set data-ctx-filled on <body> as space-separated list of filled keys
    var filled = Object.keys(ctx).filter(function (k) { return ctx[k]; }).join(" ");
    document.body.setAttribute("data-ctx-filled", filled);
  }

  function bindCopy() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest(".cmd-copy");
      if (!btn) return;
      var raw = btn.getAttribute("data-cmd") || "";
      var ctx = loadCtx();
      var text = (getMode() === "values") ? substitute(raw, ctx) : raw;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { flash(btn, "copied"); },
          function () { fallbackCopy(text); flash(btn, "copied"); });
      } else { fallbackCopy(text); flash(btn, "copied"); }
    });
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    ta.remove();
  }
  function flash(btn, txt) {
    var prev = btn.textContent; btn.textContent = txt; btn.classList.add("copied");
    setTimeout(function () { btn.textContent = prev; btn.classList.remove("copied"); }, 900);
  }

  // Progress checkboxes
  function progressKey(slug) { return "ad_progress_" + getBox() + "_" + slug; }
  function bindProgress() {
    var slug = (document.body.getAttribute("data-vector-slug") || location.pathname).replace(/[^a-z0-9_-]/gi, "_");
    var boxes = document.querySelectorAll(".ad-mechanism input[type='checkbox']");
    if (!boxes.length) return;
    var stored;
    try { stored = JSON.parse(localStorage.getItem(progressKey(slug))) || {}; } catch (e) { stored = {}; }
    Array.prototype.forEach.call(boxes, function (cb, i) {
      cb.disabled = false;
      cb.removeAttribute("disabled");
      cb.setAttribute("data-idx", i);
      cb.setAttribute("data-testid", "progress-cb-" + i);
      if (stored[i]) cb.checked = true;
      cb.addEventListener("change", function () {
        var s;
        try { s = JSON.parse(localStorage.getItem(progressKey(slug))) || {}; } catch (e) { s = {}; }
        s[i] = cb.checked;
        localStorage.setItem(progressKey(slug), JSON.stringify(s));
        applyProgress();
      });
    });
    applyProgress();
  }
  function applyProgress() {
    // Update hub progress bars if present
    var bars = document.querySelectorAll("[data-progress-slug]");
    Array.prototype.forEach.call(bars, function (bar) {
      var slug = bar.getAttribute("data-progress-slug");
      var total = parseInt(bar.getAttribute("data-progress-total") || "0", 10);
      var s;
      try { s = JSON.parse(localStorage.getItem(progressKey(slug))) || {}; } catch (e) { s = {}; }
      var done = Object.keys(s).filter(function (k) { return s[k]; }).length;
      var pct = total ? Math.round((done / total) * 100) : 0;
      var fill = bar.querySelector(".progress-fill");
      var label = bar.querySelector(".progress-label");
      if (fill) fill.style.width = pct + "%";
      if (label) label.textContent = done + " / " + total;
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderTopBar();
    bindCopy();
    bindProgress();
    applySubstitution();
  });
})();
