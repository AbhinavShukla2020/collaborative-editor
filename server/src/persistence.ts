import { Pool } from "pg";
import * as Y from "yjs";

export class PostgresPersistence {
  constructor(
    private readonly pool: Pool,
    private readonly snapshotEvery: number,
  ) {}

  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        document_id TEXT PRIMARY KEY,
        snapshot BYTEA NOT NULL,
        snapshot_sequence BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS document_updates (
        document_id TEXT NOT NULL,
        sequence BIGSERIAL PRIMARY KEY,
        update BYTEA NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_document_updates_doc_sequence
        ON document_updates(document_id, sequence);
    `);
  }

  async load(documentId: string): Promise<Y.Doc> {
    const document = new Y.Doc();
    const client = await this.pool.connect();
    try {
      const saved = await client.query(
        "SELECT snapshot, snapshot_sequence FROM documents WHERE document_id = $1",
        [documentId],
      );
      let sequence = 0;
      if (saved.rowCount) {
        Y.applyUpdate(document, new Uint8Array(saved.rows[0].snapshot));
        sequence = Number(saved.rows[0].snapshot_sequence);
      }
      const updates = await client.query(
        "SELECT update FROM document_updates WHERE document_id = $1 AND sequence > $2 ORDER BY sequence",
        [documentId, sequence],
      );
      for (const row of updates.rows) Y.applyUpdate(document, new Uint8Array(row.update));
      return document;
    } finally {
      client.release();
    }
  }

  async append(documentId: string, update: Uint8Array, document: Y.Doc): Promise<void> {
    const inserted = await this.pool.query(
      "INSERT INTO document_updates(document_id, update) VALUES ($1, $2) RETURNING sequence",
      [documentId, Buffer.from(update)],
    );
    const sequence = Number(inserted.rows[0].sequence);
    const count = await this.pool.query(
      "SELECT count(*)::int AS count FROM document_updates WHERE document_id = $1",
      [documentId],
    );
    if (Number(count.rows[0].count) >= this.snapshotEvery) {
      await this.compact(documentId, sequence, document);
    }
  }

  async compact(documentId: string, sequence: number, document: Y.Doc): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO documents(document_id, snapshot, snapshot_sequence)
         VALUES ($1, $2, $3)
         ON CONFLICT(document_id) DO UPDATE SET
           snapshot = EXCLUDED.snapshot,
           snapshot_sequence = EXCLUDED.snapshot_sequence,
           updated_at = now()`,
        [documentId, Buffer.from(Y.encodeStateAsUpdate(document)), sequence],
      );
      await client.query(
        "DELETE FROM document_updates WHERE document_id = $1 AND sequence <= $2",
        [documentId, sequence],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

