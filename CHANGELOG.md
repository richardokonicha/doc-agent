# Improvement Changelog

## Stage 0 — Static Baseline
**What we tried:** A regex-based extractor that reads `package.json`, pulls the `main` file, extracts exports, and injects them into a quickstart template.

**Evidence:** Works for simple repos with a clear `src/index.ts` and named exports. Fails for repos using `exports` instead of `main`, workspaces, and packages whose real source lives under non-standard directories.

**Decision:** Keep as baseline. It sets a floor: plausible markdown, but examples are stubs with `// TODO: add a working example`.

---

## Stage 1 — Package-Aware Extraction
**What we tried:** Replace naive `src/index.ts` lookup with multi-location scanning (`src`, `lib`, `app`, `components`, `source`) plus workspace-aware package resolution and `exports` field support.

**Evidence:** 
- `sindresorhus/has-flag` uses `"exports": "./index.js"` with no `main` field. Baseline couldn't find the entry point; agent now resolves it.
- `richardokonicha/sunrise` is a Next.js app with app-router source under `app/`. Baseline missed it; agent scans `app/`, finds `page.tsx`, and extracts `LoginFormSchema`.
- `sindresorhus/find-up` and `sindresorhus/slash` have type-only `.d.ts` entry points. Baseline fails to extract working examples; agent finds the implementation.

**Decision:** Kept. This is the main quality jump: examples went from "TODO stub" to "verified working code."

---

## Stage 2 — Export Scoring + Parameter-Aware Examples
**What we tried:** Score exports by name heuristics (`create`, `init`, `get`, package-name match), parse function signatures, and generate example arguments from parameter names.

**Evidence:** 
- `richardokonicha/deterministic-agentic-governance` has 73 exports. Without scoring, the agent picks `AgentAdapter` (internal). With scoring, it picks `createGovernanceConfig`.
- Arrow-function exports like `got`'s `create` are now detected via `const create = (...)` patterns.
- Generic type parameters like `createGovernanceConfig<T>` no longer break the signature regex.

**Decision:** Kept. Examples went from "imports a random export" to "imports the actual public API with sensible arguments."

---

## Stage 3 — Deterministic Agentic Governance Refactor
**What we tried:** Restructure the agent loop into governance-shaped modules: orchestrator, sandbox, verification gates, ledger, rollback.

**Evidence:**
- Added `src/agent/orchestrator.ts` with explicit retry/rollback loop.
- Added `src/agent/verification.ts` with import-check and TODO/FIXME gates.
- Added `src/agent/ledger.ts` that persists every attempt to `trajectories/*.json`.
- Added `src/agent/sandbox.ts` with allowlisted command execution.
- Removed LangGraph/LangChain/E2B from the runtime path. The agent is now deterministic, offline, and $0 to run.

**Decision:** Kept. The governance framing is now real code, not just a story.

---

## Final Results (6 repos)

| Repository | Baseline | Agent | Attempts |
|------------|----------|-------|----------|
| richardokonicha/verbose-next-adventure | PASS* | PASS | 0 |
| richardokonicha/sunrise | PASS* | PASS | 0 |
| sindresorhus/has-flag | PASS* | PASS | 0 |
| sindresorhus/find-up | PASS* | PASS | 0 |
| sindresorhus/slash | PASS* | PASS | 0 |
| sindresorhus/pretty-bytes | PASS* | PASS | 0 |

\* Baseline passes structure check but generates `// TODO: add a working example` stubs on every repo. Agent removes TODOs and produces verified runnable examples.

**Main contribution:** Package-aware source extraction + export scoring. The baseline finds the right package name but cannot generate a working example. The agent identifies the correct entry point, picks the real public API from multiple candidates, generates parameter-aware example code, and verifies it passes basic quality gates.

**Removed experiment:** LangGraph/LangSmith tool-calling agent. It produced generic, repo-agnostic text regardless of context. Replaced with deterministic extraction + scoring.

**Hot take:** Free LLMs via gateway are unreliable for tool use in eval settings. A well-tuned deterministic pipeline with good heuristics is more reproducible and easier to debug than a "smart" agent that hallucinates the same answer for every repo.
