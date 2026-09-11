import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { WebSocketServer, type WebSocket } from "ws";
import { loadConfig } from "./config.js";
import { PostgresPersistence } from "./persistence.js";
import { RoomRegistry } from "./registry.js";

const config = loadConfig();
const pool = new Pool({ connectionString: config.databaseUrl });
const persistence = new PostgresPersistence(pool, config.snapshotEveryUpdates);
await persistence.initialize();
const registry = new RoomRegistry(persistence, config.idleRoomTtlMs);

const http = createServer((request, response) => {
  if (request.url === "/healthz") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok", activeRooms: registry.size }));
    return;
  }
  response.writeHead(404).end();
});

const sockets = new WebSocketServer({ noServer: true, perMessageDeflate: false });
http.on("upgrade", async (request, socket, head) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const match = url.pathname.match(/^\/ws\/([A-Za-z0-9_-]{1,80})$/);
  if (!match) {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }
  try {
    const room = await registry.get(match[1]);
    sockets.handleUpgrade(request, socket, head, (websocket: WebSocket) => {
      (websocket as WebSocket & { connectionId: string }).connectionId = randomUUID();
      room.connect(websocket);
    });
  } catch (error) {
    console.error("failed to load document", error);
    socket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n");
    socket.destroy();
  }
});

const cleanup = setInterval(() => void registry.evictIdle(), Math.min(config.idleRoomTtlMs, 30_000));
cleanup.unref();

http.listen(config.port, () => console.log(`collaboration server listening on :${config.port}`));

async function shutdown(): Promise<void> {
  clearInterval(cleanup);
  sockets.close();
  http.close();
  await registry.flushAll();
  await pool.end();
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
