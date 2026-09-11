import * as awarenessProtocol from "y-protocols/awareness";
import type WebSocket from "ws";
import * as Y from "yjs";
import { awarenessUpdate, initialSync, readClientMessage, syncUpdate } from "./protocol.js";
import { PostgresPersistence } from "./persistence.js";

export class Room {
  readonly awareness: awarenessProtocol.Awareness;
  readonly sockets = new Set<WebSocket>();
  private readonly controlledClients = new WeakMap<WebSocket, Set<number>>();
  private persistenceChain = Promise.resolve();
  lastActive = Date.now();

  constructor(
    readonly id: string,
    readonly document: Y.Doc,
    private readonly persistence: PostgresPersistence,
  ) {
    this.awareness = new awarenessProtocol.Awareness(document);
    document.on("update", (update: Uint8Array, origin: unknown) => {
      this.broadcast(syncUpdate(update), origin as WebSocket | undefined);
      this.persistenceChain = this.persistenceChain
        .then(() => persistence.append(id, update, document))
        .catch((error) => console.error("failed to persist update", { id, error }));
    });
    this.awareness.on("update", ({ added, updated, removed }, origin) => {
      if (origin && this.sockets.has(origin as WebSocket)) {
        const clients = this.controlledClients.get(origin as WebSocket) ?? new Set<number>();
        for (const client of [...added, ...updated]) clients.add(client);
        for (const client of removed) clients.delete(client);
        this.controlledClients.set(origin as WebSocket, clients);
      }
      this.broadcast(awarenessUpdate(this.awareness, [...added, ...updated, ...removed]), origin);
    });
  }

  connect(socket: WebSocket): void {
    this.sockets.add(socket);
    this.controlledClients.set(socket, new Set());
    this.lastActive = Date.now();
    socket.send(initialSync(this.document));
    const clients = Array.from(this.awareness.getStates().keys());
    if (clients.length) socket.send(awarenessUpdate(this.awareness, clients));
    socket.on("message", (raw) => {
      this.lastActive = Date.now();
      try {
        const response = readClientMessage(new Uint8Array(raw as Buffer), this.document, this.awareness, socket);
        if (response) socket.send(response);
      } catch (error) {
        socket.close(1003, error instanceof Error ? error.message : "invalid update");
      }
    });
    socket.on("close", () => {
      this.sockets.delete(socket);
      const controlled = Array.from(this.controlledClients.get(socket) ?? []);
      awarenessProtocol.removeAwarenessStates(this.awareness, controlled, socket);
      this.lastActive = Date.now();
    });
  }

  private broadcast(message: Uint8Array, except?: unknown): void {
    for (const socket of this.sockets) {
      if (socket !== except && socket.readyState === 1) socket.send(message);
    }
  }

  async flush(): Promise<void> {
    await this.persistenceChain;
  }
}
