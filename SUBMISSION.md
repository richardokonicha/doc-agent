# micro1 Frontier Engineering Challenge 2026 — Submission

## What This Is

An agentic technical documentation generator that produces verified `QUICKSTART.md` files for TypeScript/JavaScript repositories. The agent reads source code, scores public exports, drafts a quickstart, and verifies it through multiple signals (TypeScript, lint, runtime). If verification fails, it revises the draft automatically.

## Repo

`doc-agent/` contains the complete solution.

## How to Judge

```bash
cd doc-agent
npm install
npm test
npm run eval
```

Expected result:
- Tests pass
- TypeScript typecheck passes
- All 6 repos: `baseline=FAIL`, `agent=PASS (0 attempts)`

## Results

| Repository | Baseline | Agent | Attempts |
|------------|----------|-------|----------|
| `richardokonicha/verbose-next-adventure` | FAIL | PASS | 0 |
| `richardokonicha/sunrise` | FAIL | PASS | 0 |
| `sindresorhus/has-flag` | FAIL | PASS | 0 |
| `sindresorhus/find-up` | FAIL | PASS | 0 |
| `sindresorhus/slash` | FAIL | PASS | 0 |
| `sindresorhus/pretty-bytes` | FAIL | PASS | 0 |

**Baseline failure rate:** 6/6  
**Agent pass rate:** 6/6  
**Average attempts:** 0

## Key Innovation

Static extraction fails because it picks arbitrary exports and generates unverified examples. This project adds two missing stages:

1. **Package-aware source extraction** — finds the actual entry point and scans all source files, not just `index.ts`
2. **Deterministic export scoring** — prefers `create*`/`find*`/`get*`/`format*`, penalizes `Stop`/`Symbol`/`internal`, and validates against actual function/const patterns in source code

For app repos (Next.js, Vite + React), the agent detects the framework and generates an app quickstart (`npm run dev`) instead of a library code example.

## Video

`doc-agent/video/script.md` contains the timed recording script.

## Outputs

- `doc-agent/output/baseline/` — baseline quickstarts
- `doc-agent/output/agent/` — agent-generated quickstarts
- `doc-agent/trajectories/` — JSON trajectory files
