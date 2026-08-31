# Improvement Changelog

## Stage 0 — Static Baseline
**What we tried:** A regex-based extractor that reads `package.json`, pulls the `main` file, extracts exports, and injects them into a quickstart template.

**Evidence:** Works for simple repos with a clear `src/index.ts` and named exports. Fails for monorepos, workspaces, repos without a `main` field, and packages whose real source lives under `source/` or `packages/`.

**Decision:** Keep as baseline. It sets a floor: plausible markdown, but examples are often broken or missing.

---

## Stage 1 — Package-Aware Extraction
**What we tried:** Replace naive `src/index.ts` lookup with multi-location scanning (`src`, `lib`, `app`, `components`, `source`) plus workspace-aware package resolution.

**Evidence:** 
- `sindresorhus/got` source lives in `source/`, not `src/`. Baseline missed it; agent now finds `source/index.ts`.
- `remeda/remeda` is a workspace monorepo. Baseline looked at the root `package.json` (no `main`) and gave up. Agent resolves to `packages/remeda/` and scans 456 source files.

**Decision:** Kept. This fixed 2 of the 3 baseline failures.

---

## Stage 2 — Export Scoring + Parameter-Aware Examples
**What we tried:** Score exports by name heuristics (`create`, `init`, `get`, package-name match), parse function signatures, and generate example arguments from parameter names.

**Evidence:** 
- `richardokonicha/deterministic-agentic-governance` has 73 exports. Without scoring, the agent picked `AgentAdapter` (internal). With scoring, it picks `createGovernanceConfig`.
- Arrow-function exports like `got`'s `create` are now detected via `const create = (...)` patterns.
- Generic type parameters like `createGovernanceConfig<T>` no longer break the signature regex.

**Decision:** Kept. This is the main quality jump: examples went from "imports a random export" to "imports the actual public API with sensible arguments."

---

## Stage 3 — Deterministic Agentic Governance Refactor
**What we tried:** Restructure the agent loop into governance-shaped modules: orchestrator, sandbox, verification gates, ledger, rollback.

**Evidence:**
- Added `src/agent/orchestrator.ts` with explicit retry/rollback loop.
- Added `src/agent/verification.ts` with import-check and TODO/FIXME gates.
- Added `src/agent/ledger.ts` that persists every attempt to `trajectories/*.json`.
- Added `src/agent/sandbox.ts` with allowlisted command execution.
- Removed LangGraph/LangChain/E2B from the runtime path. The agent is now deterministic, offline, and $0 to run.

**Decision:** Kept. The governance framing is now real code, not just a story. It also fixed the "agent produces identical output for every repo" bug by removing the flaky LLM tool-calling step.

---

## Final Results (6 repos)

| Repository | Baseline | Agent | Attempts |
|------------|----------|-------|----------|
| richardokonicha/deterministic-agentic-governance | PASS | PASS | 0 |
| richardokonicha/verbose-next-adventure | PASS | PASS | 0 |
| richardokonicha/sunrise | PASS | PASS | 0 |
| sindresorhus/got | FAIL | PASS | 0 |
| remeda/remeda | FAIL | PASS | 0 |
| microsoft/typechat | FAIL | PASS | 0 |

**Baseline failure rate:** 3/6  
**Agent pass rate:** 6/6  
**Main contribution:** Package-aware source extraction + export scoring. Without Stage 1, the agent fails on 3/6 repos simply because it cannot find the source code. Without Stage 2, it picks the wrong export and generates broken examples.

**Removed experiment:** LangGraph/LangSmith tool-calling agent. It produced generic, repo-agnostic text regardless of context. Replaced with deterministic extraction + scoring.

**Hot take:** Free LLMs via gateway are unreliable for tool use in eval settings. A well-tuned deterministic pipeline with good heuristics is more reproducible and easier to debug than a "smart" agent that hallucinates the same answer for every repo.
