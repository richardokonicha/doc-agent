# doc-agent — Agentic Quickstart Generator

Agentic technical documentation generator for TypeScript/JavaScript repos.
Generates a verified `QUICKSTART.md` from source code, tests, and README.

## Repos

| Repo | Type | Result |
|------|------|--------|
| `richardokonicha/verbose-next-adventure` | Next.js app | PASS (0 attempts) |
| `richardokonicha/sunrise` | Next.js app | PASS (0 attempts) |
| `sindresorhus/has-flag` | Library | PASS (0 attempts) |
| `sindresorhus/find-up` | Library | PASS (0 attempts) |
| `sindresorhus/slash` | Library | PASS (0 attempts) |
| `sindresorhus/pretty-bytes` | Library | PASS (0 attempts) |

## Prerequisites

- Node.js >= 20
- npm

## Install

```bash
cd doc-agent
npm install
```

## Run

Run baseline and agent on all 6 repos:

```bash
npm run eval
```

This clones repos into `/tmp/doc-agent/`, runs baseline, runs agent, and writes outputs to `doc-agent/output/`.

Run on a single local repo:

```bash
npx tsx scripts/run.ts /path/to/repo
```

## Test

```bash
npm test
```

## Outputs

- `doc-agent/output/baseline/` — baseline quickstarts
- `doc-agent/output/agent/` — agent-generated quickstarts
- `doc-agent/trajectories/` — JSON trajectory files

## How It Works

1. **Extract** — reads `package.json`, source files, and tests to build `RepoKnowledge`
2. **Score exports** — deterministic scoring picks the most useful public export
3. **Draft** — generates `QUICKSTART.md` with install, example, and explanation
4. **Verify** — checks import presence, TypeScript compilation, lint, and runtime execution
5. **Revise** — re-generates draft if verification fails (up to 3 attempts)

For app repos (Next.js, Vite + React), the agent detects the framework and generates an app quickstart with `npm run dev` instead of a code example.

## Key Insight

Static extraction produces plausible but broken examples. The agentic loop (draft → verify → revise) catches errors that a one-shot generator cannot.
