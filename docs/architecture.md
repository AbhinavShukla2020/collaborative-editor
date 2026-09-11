# Architecture

Every open document is a Y.Doc containing one shared Y.Text. The browser keeps a
local copy in IndexedDB and connects through the standard y-websocket binary
protocol. A text diff turns each textarea input into the smallest contiguous Yjs
delete/insert pair instead of replacing the entire document.

The Node server keeps active documents in a room registry. The first connection
loads the latest PostgreSQL snapshot followed by ordered updates. Later clients
receive a state-vector sync, so only missing CRDT operations cross the wire.
Document updates are broadcast immediately and appended to PostgreSQL through a
per-room promise chain, preserving database order without blocking WebSockets.

After a configurable number of updates, the server encodes a fresh snapshot in
one transaction and deletes older update rows. Empty rooms are flushed and
evicted after an idle timeout. Awareness messages are ephemeral: cursors and
presence are broadcast but not written to the database.

