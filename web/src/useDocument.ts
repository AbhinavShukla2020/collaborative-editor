import { useCallback, useEffect, useMemo, useState } from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { diffText } from "./diff";

const colors = ["#ff7a59", "#6e8bff", "#2cba7d", "#b36eff", "#e7ad31"];

export function useDocument(documentId: string) {
  const document = useMemo(() => new Y.Doc(), [documentId]);
  const sharedText = useMemo(() => document.getText("content"), [document]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("offline");
  const [peers, setPeers] = useState(1);

  useEffect(() => {
    const local = new IndexeddbPersistence(`margin:${documentId}`, document);
    const websocketUrl = import.meta.env.VITE_WS_URL ?? "ws://localhost:1234/ws";
    const provider = new WebsocketProvider(websocketUrl, documentId, document);
    const observer = () => setText(sharedText.toString());
    sharedText.observe(observer);
    observer();
    provider.awareness.setLocalStateField("user", {
      name: `Editor ${Math.floor(Math.random() * 100)}`,
      color: colors[document.clientID % colors.length],
    });
    const updateStatus = ({ status: value }: { status: string }) => setStatus(value);
    const updatePeers = () => setPeers(provider.awareness.getStates().size);
    provider.on("status", updateStatus);
    provider.awareness.on("change", updatePeers);
    return () => {
      sharedText.unobserve(observer);
      provider.destroy();
      local.destroy();
      document.destroy();
    };
  }, [document, documentId, sharedText]);

  const replaceText = useCallback(
    (next: string) => {
      const patch = diffText(sharedText.toString(), next);
      document.transact(() => {
        if (patch.remove) sharedText.delete(patch.index, patch.remove);
        if (patch.insert) sharedText.insert(patch.index, patch.insert);
      }, "editor");
    },
    [document, sharedText],
  );

  return { text, replaceText, status, peers };
}

