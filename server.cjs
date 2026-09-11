const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const root = __dirname;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};
function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const relative = pathname === "/" ? "index.html" : pathname.slice(1);
      const file = path.resolve(root, relative);
      const allowed =
        ["index.html", "app.js", "styles.css", "favicon.svg"].includes(
          relative,
        ) || relative.startsWith("assets/");
      if (!allowed || !file.startsWith(root + path.sep)) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const data = await fs.readFile(file);
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
}
if (require.main === module) {
  const port = Number(process.env.PORT || 5178);
  createServer().listen(port, "127.0.0.1", () =>
    console.log(`EMDR preview: http://127.0.0.1:${port}`),
  );
}
module.exports = { createServer };
