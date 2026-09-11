import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import * as awarenessProtocol from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import * as Y from "yjs";

export const MESSAGE_SYNC = 0;
export const MESSAGE_AWARENESS = 1;

export function initialSync(document: Y.Doc): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(encoder, document);
  return encoding.toUint8Array(encoder);
}

export function syncUpdate(update: Uint8Array): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeUpdate(encoder, update);
  return encoding.toUint8Array(encoder);
}

export function awarenessUpdate(awareness: awarenessProtocol.Awareness, clients: number[]): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
  encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, clients));
  return encoding.toUint8Array(encoder);
}

export function readClientMessage(
  message: Uint8Array,
  document: Y.Doc,
  awareness: awarenessProtocol.Awareness,
  origin: unknown,
): Uint8Array | null {
  const decoder = decoding.createDecoder(message);
  const type = decoding.readVarUint(decoder);
  if (type === MESSAGE_SYNC) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.readSyncMessage(decoder, encoder, document, origin);
    const response = encoding.toUint8Array(encoder);
    return response.length > 1 ? response : null;
  }
  if (type === MESSAGE_AWARENESS) {
    awarenessProtocol.applyAwarenessUpdate(awareness, decoding.readVarUint8Array(decoder), origin);
    return null;
  }
  throw new Error(`unsupported message type ${type}`);
}

