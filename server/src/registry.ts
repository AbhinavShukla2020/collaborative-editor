import { PostgresPersistence } from "./persistence.js";
import { Room } from "./room.js";

export class RoomRegistry {
  private readonly rooms = new Map<string, Room>();
  private readonly loading = new Map<string, Promise<Room>>();

  constructor(
    private readonly persistence: PostgresPersistence,
    private readonly idleTtlMs: number,
  ) {}

  async get(documentId: string): Promise<Room> {
    const existing = this.rooms.get(documentId);
    if (existing) return existing;
    const inFlight = this.loading.get(documentId);
    if (inFlight) return inFlight;
    const load = this.persistence.load(documentId).then((document) => {
      const room = new Room(documentId, document, this.persistence);
      this.rooms.set(documentId, room);
      this.loading.delete(documentId);
      return room;
    });
    this.loading.set(documentId, load);
    return load;
  }

  async evictIdle(now = Date.now()): Promise<number> {
    let evicted = 0;
    for (const [id, room] of this.rooms) {
      if (room.sockets.size === 0 && now - room.lastActive >= this.idleTtlMs) {
        await room.flush();
        room.document.destroy();
        this.rooms.delete(id);
        evicted += 1;
      }
    }
    return evicted;
  }

  get size(): number {
    return this.rooms.size;
  }
}

