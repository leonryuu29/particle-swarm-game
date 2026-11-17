import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

export async function startServer({ port = 4173, root = DEFAULT_ROOT } = {}) {
  const safeRoot = resolve(root);
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://localhost");
      const pathname = decodeURIComponent(requestUrl.pathname);
      const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
      const target = resolve(join(safeRoot, normalize(relative)));

      if (target !== safeRoot && !target.startsWith(safeRoot + sep)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      const info = await stat(target);
      if (!info.isFile()) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      response.writeHead(200, {
        "Content-Type": MIME_TYPES[extname(target).toLowerCase()] ?? "application/octet-stream",
        "Cache-Control": "no-store",
      });
      createReadStream(target).pipe(response);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });

  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, "127.0.0.1", resolveListen);
  });

  const address = server.address();
  return {
    server,
    url: `http://127.0.0.1:${address.port}/`,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { url } = await startServer();
  console.log(`Particle Swarm running at ${url}`);
}
