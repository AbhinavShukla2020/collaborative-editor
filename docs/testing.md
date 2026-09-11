# Test plan

The server unit tests cover configuration and binary protocol framing. The
Playwright suite generates 30 independent document scenarios. Each opens two
isolated browser contexts, establishes a shared baseline, creates overlapping
edits, and polls until both replicas contain both changes in the same order.
Five scenarios repeat the edit with one browser offline.

```bash
cd server && npm install && npm test
cd ../web && npm install && npx playwright install chromium && npm run test:e2e
```

A 50-editor load run should use separate Yjs client IDs, a realistic keystroke
distribution, and several document sizes. Measure server receive-to-broadcast
latency rather than browser typing latency, and record PostgreSQL location,
snapshot interval, Node version, and compression settings. No latency value is
pre-filled in this repository.

