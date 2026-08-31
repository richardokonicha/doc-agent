# Video Script — micro1 Frontier Engineering Challenge 2026

**Target length**: 4–5 minutes
**Tone**: concise, technical, no fluff

---

## 0:00–0:30 — Problem & Baseline

1. Open terminal in `doc-agent/`.
2. Run baseline on `has-flag`:
   ```bash
   npx tsx src/baseline/index.ts /tmp/doc-agent/has-flag
   ```
3. Show output file:
   ```bash
   cat output/baseline/has-flag-QUICKSTART.md
   ```
4. Point out: `// TODO: add a working example` — baseline generates a placeholder, not a real example.
5. Run full eval to see baseline across all repos:
   ```bash
   npx tsx scripts/run-eval.ts
   ```
6. Show summary: `baseline=FAIL` for all 6 repos.

**Key message**: Static extraction produces plausible but broken examples. It doesn’t verify anything.

---

## 0:30–2:00 — Agent Solution

1. Open `src/agent/draft.ts` and `src/agent/orchestrator.ts`.
2. Show the three stages:
   - **Extract**: reads `package.json`, source files, and tests → `RepoKnowledge`
   - **Score**: deterministic export scoring (penalize `Stop`/`Symbol`/`internal`, prefer `find*`/`get*`/`format*`/`create*`)
   - **Verify**: import presence, TypeScript check, lint, runtime execution
3. Show `src/agent/draft.ts` scoring logic (lines 204–220).
4. Show app repo detection: `src/agent/draft.ts` lines 165–197 (`isApp` quickstart with `npm run dev`).

**Key message**: The agent doesn’t use an LLM to explore the repo. All extraction is deterministic code. The “agentic” part is the draft → verify → revise loop.

---

## 2:00–3:30 — Live Demo

1. Run agent on a single repo:
   ```bash
   npx tsx src/agent/index.ts /tmp/doc-agent/has-flag
   ```
2. Show output: `verified=true, attempts=0`.
3. Open generated quickstart:
   ```bash
   cat output/agent/sindresorhus_has-flag-QUICKSTART.md
   ```
4. Show correct import: `import { hasFlag } from 'has-flag';` with valid example.
5. Run full eval:
   ```bash
   npx tsx scripts/run-eval.ts
   ```
6. Show final summary table: all 6 repos `baseline=FAIL, agent=PASS (0 attempts)`.

**Key message**: Same deterministic logic, applied to 6 different repo shapes. All pass on first attempt.

---

## 3:30–4:30 — Trajectories & Reproducibility

1. Open `trajectories/` directory:
   ```bash
   ls trajectories/
   ```
2. Show one trajectory file:
   ```bash
   cat trajectories/sindresorhus_has-flag.json
   ```
3. Explain fields: `exportsFound`, `selectedExport`, `draft`, `verified`, `attempts`.
4. Show test + typecheck:
   ```bash
   npx vitest run && npx tsc --noEmit
   ```
5. Show zero dependencies on external services: no API keys, no LLM calls, no E2B.

**Key message**: Fully reproducible. Anyone can clone the repo and run `npm install && npx tsx scripts/run-eval.ts` to get the same results.

---

## 4:30–5:00 — Closing

- Recap: `6/6` baseline fail, `6/6` agent pass, `0` attempts.
- Mention: app repos (`verbose-next-adventure`, `sunrise`) get `npm run dev` quickstarts instead of code examples.
- Mention: test fixture in `test/fixtures/bad-baseline-repo/` proves baseline failure + agent recovery.
- Call to action: `cd doc-agent && npm install && npm run eval`
