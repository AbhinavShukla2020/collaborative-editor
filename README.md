# Margin — Collaborative Document Editor

Margin is a React and Node.js document editor built on the Yjs CRDT. Multiple
browsers edit one document over WebSockets, keep an offline IndexedDB replica,
and merge changes after reconnecting. PostgreSQL stores an append-only update log
with periodic compacted snapshots.

## Run locally

```bash
docker compose up --build
```

Open `http://localhost:5173/?doc=notes` in two browser windows. The status badge
turns green after the y-websocket handshake; typing in either textarea updates
the other.

For development without containers:

```bash
cd server && npm install && npm run dev
cd web && npm install && npm run dev
```

## What is implemented

- Yjs sync and awareness messages over a small WebSocket server.
- Minimal contiguous text patches, preserving CRDT merge behavior.
- Local offline persistence and automatic state-vector replay.
- PostgreSQL update history, periodic snapshots, and idle-room eviction.
- A health endpoint reporting active rooms.
- Thirty two-browser Playwright convergence cases, including offline edits.

The baseline is deliberately plain text so the distributed-state behavior stays
visible. Rich text can be added with ProseMirror's Yjs binding without changing
the persistence or WebSocket layers. Authentication, document ACLs, and
horizontal room ownership are left as deployment-specific extensions.

