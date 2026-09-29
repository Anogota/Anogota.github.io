#!/usr/bin/env node
/**
 * Simple static server + Jekyll rebuilder for AD_metodology preview.
 * Serves /app/jekyll_site/_site on port 3000.
 * Rebuilds on demand (POST /_rebuild) and watches _ad_vectors / _layouts / _includes / assets on interval.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawnSync, spawn } = require("child_process");

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";
const JEKYLL_SRC = "/app/jekyll_site";
const JEKYLL_OUT = path.join(JEKYLL_SRC, "_site");

const GEM_BIN = "/root/.gem/ruby/3.1.0/bin/jekyll";
const GEM_ENV = {
  ...process.env,
  GEM_HOME: "/root/.gem/ruby/3.1.0",
  GEM_PATH: "/root/.gem/ruby/3.1.0",
  PATH: "/root/.gem/ruby/3.1.0/bin:" + process.env.PATH
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".ico":  "image/x-icon",
  ".txt":  "text/plain; charset=utf-8",
  ".map":  "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2":"font/woff2"
};

function build(sync = true) {
  console.log("[jekyll] building…");
  const args = ["build", "--source", JEKYLL_SRC, "--destination", JEKYLL_OUT];
  if (sync) {
    const r = spawnSync(GEM_BIN, args, { env: GEM_ENV, stdio: "inherit" });
    console.log("[jekyll] build exit:", r.status);
    return r.status === 0;
  } else {
    const p = spawn(GEM_BIN, args, { env: GEM_ENV, stdio: "inherit" });
    p.on("exit", (code) => console.log("[jekyll] async build exit:", code));
    return true;
  }
}

function watchAndRebuild() {
  const watchPaths = [
    path.join(JEKYLL_SRC, "_ad_vectors"),
    path.join(JEKYLL_SRC, "_layouts"),
    path.join(JEKYLL_SRC, "_includes"),
    path.join(JEKYLL_SRC, "assets"),
    path.join(JEKYLL_SRC, "AD_metodology"),
    path.join(JEKYLL_SRC, "_config.yml")
  ];
  let scheduled = null;
  const schedule = () => {
    clearTimeout(scheduled);
    scheduled = setTimeout(() => build(false), 400);
  };
  watchPaths.forEach((p) => {
    if (!fs.existsSync(p)) return;
    try { fs.watch(p, { recursive: true }, schedule); } catch (e) { fs.watch(p, schedule); }
  });
}

function sanitize(u) {
  const p = u.split("?")[0].split("#")[0];
  return p.replace(/\/+/g, "/").replace(/\.\./g, "");
}

function serve(req, res) {
  if (req.method === "POST" && req.url === "/_rebuild") {
    const ok = build(true);
    res.writeHead(ok ? 200 : 500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok }));
    return;
  }
  let urlPath = sanitize(decodeURIComponent(req.url || "/"));
  if (urlPath === "/") urlPath = "/AD_metodology/";
  let fsPath = path.join(JEKYLL_OUT, urlPath);
  try {
    let stat = fs.statSync(fsPath);
    if (stat.isDirectory()) {
      fsPath = path.join(fsPath, "index.html");
      stat = fs.statSync(fsPath);
    }
    const ext = path.extname(fsPath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Frame-Options": "SAMEORIGIN"
    });
    fs.createReadStream(fsPath).pipe(res);
  } catch (e) {
    // Try 404 page fallback
    const notFound = path.join(JEKYLL_OUT, "404.html");
    if (fs.existsSync(notFound)) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      fs.createReadStream(notFound).pipe(res);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 not found: " + urlPath);
    }
  }
}

// Initial build
if (!fs.existsSync(JEKYLL_OUT) || !fs.existsSync(path.join(JEKYLL_OUT, "AD_metodology", "index.html"))) {
  build(true);
}
watchAndRebuild();

http.createServer(serve).listen(PORT, HOST, () => {
  console.log(`[preview] AD_metodology → http://${HOST}:${PORT}/AD_metodology/`);
});
