import { useState } from "react";
import { useDocument } from "./useDocument";
import "./styles.css";

function currentDocument(): string {
  const value = new URLSearchParams(location.search).get("doc") ?? "welcome";
  return /^[A-Za-z0-9_-]{1,80}$/.test(value) ? value : "welcome";
}

export default function App() {
  const [documentId] = useState(currentDocument);
  const { text, replaceText, status, peers } = useDocument(documentId);

  return <main><aside><div className="brand">M</div><button className="new" onClick={() => location.assign(`?doc=${crypto.randomUUID()}`)}>+</button></aside><section className="workspace"><header><div><p className="eyebrow">SHARED DOCUMENT</p><h1>{documentId}</h1></div><div className="presence"><span className={status} /> <span data-testid="status">{status}</span> · {peers} online</div></header><textarea data-testid="editor" aria-label="Shared document" spellCheck="true" value={text} onChange={(event) => replaceText(event.target.value)} placeholder="Start writing. Changes merge as everyone types." /><footer><span>{text.length} characters</span><span>Saved locally and synced with Yjs</span></footer></section></main>;
}

