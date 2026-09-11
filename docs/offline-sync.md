# Offline editing and reconnects

Yjs assigns operations stable client and clock identifiers. When a browser loses
the network, edits continue against the local Y.Doc and are persisted by
y-indexeddb. On reconnect, the browser and server exchange state vectors, then
send the operations each side is missing. Concurrent insertions receive a stable
order and deletions remain idempotent, so every replica converges without a
last-write-wins overwrite.

The WebSocket server does not need a special “offline replay” endpoint. Replay is
the ordinary Yjs sync protocol. The important application responsibility is to
reuse the same local document while disconnected and avoid clearing IndexedDB
before the provider has synchronized.

Five Playwright cases deliberately disconnect one browser, edit both replicas,
restore the connection, and assert convergence. The remaining cases keep both
browsers online while editing concurrently.

