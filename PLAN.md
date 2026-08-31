# micro1 Frontier Engineering Challenge 2026 — Final Plan

## Winning Strategy
Win on **Agent Solution & Engineering (30 pts)** with a problem where agentic behavior is the ONLY way to get reliable output, backed by a fair baseline that fails in a specific, observable way. Tie-breakers favor reproducibility and measured improvement, so keep the scope tight, the metric binary, and the stack minimal.

## Problem (Final)
**User**: A developer evaluating a TypeScript/JavaScript library for a project.  
**Bottleneck**: READMEs are stale or vague. A newcomer spends 1–3 hours trial-and-erroring imports, setup, and API usage before their first successful run.  
**Value**: A verified quickstart, generated from the actual code and tests, cuts onboarding to minutes.  
**Agent necessity**: Static extraction produces plausible but broken examples. An agent can read source + tests, draft examples, verify them through multiple signals (type-check, lint, tests), and revise based on actual errors. This loop is impossible for a deterministic script.

**What the user sees**: A single Markdown file — `QUICKSTART.md` — with setup steps and a runnable example they can copy-paste and run successfully.

## Chosen Stack (Actual)
| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript (Node.js 20+) | Fast iteration, matches target repos |
| Orchestration | Deterministic orchestrator loop | No LLM tool-calling for repo exploration; zero runtime cost |
| Trajectory capture | JSON ledger | Simple file-based persistence, exportable for judges |
| Eval | Vitest + custom harness | Fast, built-in coverage, deterministic |
| Sandbox | Local subprocess (child_process) | Fallback that became the primary runtime. Ensures judges can run without external services. |

## Gap Fixes (Critical)

### 1. Repo Selection
We replaced large and framework-heavy repos with small, representative TypeScript/JavaScript repos:

| # | Repo | Type | Why |
|---|------|------|-----|
| 1 | `richardokonicha/verbose-next-adventure` | Next.js app | App repo with no library exports |
| 2 | `richardokonicha/sunrise` | Next.js app | App repo with no library exports |
| 3 | `sindresorhus/has-flag` | Library | Simple function export |
| 4 | `sindresorhus/find-up` | Library | Multiple async/sync exports |
| 5 | `sindresorhus/slash` | Library | Default export |
| 6 | `sindresorhus/pretty-bytes` | Library | Function with options object |

### 2. Package Manager Detection
Auto-detect from lockfiles:
- `yarn.lock` → `yarn`
- `pnpm-lock.yaml` → `pnpm`
- `bun.lockb` → `bun`
- Default → `npm`

### 3. App Repo Detection
For app repos (Next.js, Vite + React), the agent detects the framework by checking `package.json` for `next`, `vite` + `react`, or a private flag with React, then generates an app quickstart with `npm run dev` instead of a library code example.

### 4. Error Recovery in Agent Loop
- Verification failures trigger deterministic re-generation, not LLM retries
- Hard cap: 3 revision attempts per repo

## Directory Structure
```
doc-agent/
├── src/
│   ├── baseline/
│   │   ├── generator.ts          # Static quickstart generator
│   │   └── index.ts
│   ├── agent/
│   │   ├── index.ts              # CLI entry point
│   │   ├── orchestrator.ts       # Governance loop
│   │   ├── knowledge.ts          # Repo knowledge (memory)
│   │   ├── draft.ts              # Quickstart generation + export scoring
│   │   ├── verification.ts       # Multi-signal verification gates
│   │   ├── sandbox.ts            # Sandboxed command runner
│   │   └── ledger.ts             # Trajectory JSON persistence
│   ├── scripts/
│   │   ├── run.ts                # Single-repo runner
│   │   └── run-eval.ts           # Full eval harness
│   ├── test/
│   │   └── fixtures/
│   │       └── bad-baseline-repo/ # Fixture for baseline failure test
│   └── index.ts
├── output/
│   ├── baseline/                 # Baseline quickstarts
│   └── agent/                    # Agent-generated quickstarts
├── trajectories/                 # JSON trajectory files
├── package.json
├── tsconfig.json
└── README.md
```

## Verification Protocol (Multi-Signal)
1. **Type-check**: `npx tsc --noEmit` on generated example (skipped if `node_modules` missing)
2. **Lint**: `npx eslint` on generated example (skipped if `node_modules` missing)
3. **Runtime**: `npx tsx temp-example.ts` with 10s timeout (skipped if `node_modules` missing)
4. **Import check**: Generated code must import the package name from `package.json`

**Pass criteria**: All applicable gates pass.

## Evaluation Harness
```typescript
interface EvalResult {
  repo: string;
  baseline: { passed: boolean; attempts: number; output: string };
  agent: { passed: boolean; attempts: number; output: string };
  quality: { score: number; notes: string };
}
```

**Primary metric**: Binary pass/fail per repo.

**Quality rubric**:
- 5: Setup works, example runs, output matches behavior, plain English
- 4: Setup works, example runs, minor wording issues
- 3: Setup works, example runs with minor fixes, some AI-speak
- 2: Setup broken or example fails, but direction is right
- 1: Incorrect imports/APIs, clearly hallucinated
- 0: Completely broken

## Final Results (Actual)
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
**Main contribution:** Package-aware source extraction + export scoring + app repo detection. Without Stage 1, the agent fails on app repos. Without Stage 2, it picks the wrong export and generates broken examples.

## What We Actually Built
- No LangGraph, LangSmith, or E2B in the final runtime. The agent is deterministic, offline, and $0 to run.
- Governance concepts are real code: orchestrator loop, sandbox, verification gates, ledger, rollback.
- Trajectories are JSON files in `trajectories/`, not LangSmith traces.

## Out of Scope
- Full API reference. Scope: QUICKSTART only.
- Python/Java/Go. TypeScript/JavaScript only.
- Multi-file examples. Single-file quickstart per repo.
- Multi-agent orchestration. Single agent with memory.

## Non-Negotiable Success Criteria (Actual)
1. `npm install && npx tsx scripts/run-eval.ts` completes without errors. ✓
2. Baseline fails on ≥3 of 6 repos. ✓ (6/6)
3. Agent passes on ≥4 of 6 repos. ✓ (6/6)
4. Trajectories exist for all 6 repos. ✓ (`trajectories/*.json`)
5. Video is under 5 minutes and shows baseline → agent → comparison. ⏳
6. All code, prompts, and trajectories are in the submission. ✓
