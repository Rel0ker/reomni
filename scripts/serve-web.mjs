import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const port = Number(process.env.PORT || 10005);
const apiOrigin = process.env.API_ORIGIN || "http://127.0.0.1:10006";
const root = path.resolve(process.env.WEB_ROOT || "dist");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
  ".ico": "image/x-icon",
};

function proxy(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  const target = new URL(url.pathname + url.search, apiOrigin);
  const headers = { ...req.headers, host: target.host };
  const upstream = http.request(
    target,
    { method: req.method, headers },
    (pres) => {
      res.writeHead(pres.statusCode || 502, pres.headers);
      pres.pipe(res);
    },
  );
  upstream.on("error", () => {
    if (res.headersSent) return;
    res.writeHead(502, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "API недоступен" }));
  });
  req.pipe(upstream);
}

function sendFile(res, file) {
  const ext = path.extname(file);
  res.writeHead(200, {
    "content-type": mime[ext] || "application/octet-stream",
    "cache-control": ext === ".html" ? "no-cache" : "public, max-age=3600",
  });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
    proxy(req, res);
    return;
  }
  const rel = decodeURIComponent(url.pathname);
  const file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.stat(file, (err, stat) => {
    const target = !err && stat.isDirectory() ? path.join(file, "index.html") : file;
    fs.stat(target, (err2, stat2) => {
      if (!err2 && stat2.isFile()) {
        sendFile(res, target);
        return;
      }
      const index = path.join(root, "index.html");
      fs.stat(index, (err3) => {
        if (err3) {
          res.writeHead(404);
          res.end("not found");
          return;
        }
        sendFile(res, index);
      });
    });
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`web http://0.0.0.0:${port} -> ${apiOrigin}`);
});
