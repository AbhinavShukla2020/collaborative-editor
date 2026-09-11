export type Config = {
  port: number;
  databaseUrl: string;
  snapshotEveryUpdates: number;
  idleRoomTtlMs: number;
};

function positiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

export function loadConfig(): Config {
  return {
    port: positiveInteger("PORT", 1234),
    databaseUrl: process.env.DATABASE_URL ?? "postgres://editor:editor@postgres:5432/editor",
    snapshotEveryUpdates: positiveInteger("SNAPSHOT_EVERY_UPDATES", 100),
    idleRoomTtlMs: positiveInteger("IDLE_ROOM_TTL_MS", 60_000),
  };
}

