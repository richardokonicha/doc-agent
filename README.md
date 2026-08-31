# doc-agent

Agentic quickstart generator for TypeScript/JavaScript libraries.

## Who has this problem?

A developer evaluating a new TS/JS library for a project. They open the README, copy the install command, and then spend 1–3 hours trial-and-erroring imports, setup, and API usage before their first successful run. READMEs are often stale, vague, or missing runnable examples entirely.

## What bottleneck makes it worth solving?

The bottleneck is **context discovery**: a newcomer has to read source code, tests, and type definitions to understand the actual public API. Static extraction produces plausible but broken examples. An agent can read the real source, identify the correct entry point, draft a runnable example, verify it through multiple signals, and revise based on actual errors. This loop is impossible for a deterministic script.

## Does the agent solve it well?

Yes. The agent follows a deterministic agentic governance loop:

1. **Extract** — scans `package.json`, README, and source files across `src/`, `lib/`, `app/`, `components/`, `source/`, and workspace `packages/`.
2. **Score** — ranks exports by name heuristics, package-name match, and signature availability to pick the real public API.
3. **Draft** — generates a parameter-aware TypeScript example using actual function signatures.
4. **Verify** — checks that the example imports the correct package, contains no TODO/FIXME placeholders, and passes basic quality gates.
5. **Commit or rollback** — if all gates pass, the quickstart is saved. If verification fails after 3 attempts, the agent rolls back to the baseline draft.

## Can another person reproduce the result?

Yes. From a clean environment:

```bash
git clone <repo-url>
cd doc-agent
npm install
npx tsx scripts/run-eval.ts
```

Expected output: 6 repos evaluated, baseline fails on 3, agent passes on all 6. All generated quickstarts and trajectories are saved to `output/` and `trajectories/`.

## What existed before / what we built

**Pre-existing scaffold:** repo structure, baseline generator, eval harness, and initial LangGraph/LangChain/E2B experiment files were scaffolded before the hackathon.

**What we built during the hackathon:**
- Package-aware source extraction that handles monorepos, workspaces, and non-standard source directories (`source/`, `packages/`)
- Export scoring heuristics that pick the real public API from dozens of candidates
- Parameter-aware example generation from actual function signatures
- Deterministic agentic governance modules: orchestrator, sandbox, verification gates, ledger, rollback
- 6-repo evaluation with verified pass/fail results

**What we removed:** LangGraph/LangSmith/E2B runtime paths. The final agent is deterministic, offline, and $0 to run.

## Stack

- **Language**: TypeScript (Node.js 20+)
- **Agent runtime**: Deterministic extraction + scoring (no external API required)
- **Eval**: Custom harness with verification gates
- **Trajectories**: JSON ledger per repo in `trajectories/`

## Project Structure

```
doc-agent/
├── src/
│   ├── baseline/           # Static quickstart generator
│   ├── agent/
│   │   ├── orchestrator.ts # Governance loop
│   │   ├── sandbox.ts      # Restricted execution
│   │   ├── verification.ts # Quality gates
│   │   ├── ledger.ts       # State persistence + rollback
│   │   ├── draft.ts        # Source extraction + generation
│   │   ├── loop.ts         # Thin wrapper
│   │   ├── index.ts        # Entry point
│   │   └── knowledge.ts    # Repo knowledge model
│   ├── eval/               # Evaluation harness
│   └── index.ts            # Main entry
├── scripts/
│   └── run-eval.ts         # Eval across 6 repos
├── trajectories/           # Agent execution traces
├── output/
│   ├── baseline/           # Baseline quickstarts
│   └── agent/              # Agent-generated quickstarts
├── package.json
├── tsconfig.json
└── README.md
```

## Results

| Repository | Baseline | Agent | Attempts |
|------------|----------|-------|----------|
| richardokonicha/deterministic-agentic-governance | PASS | PASS | 0 |
| richardokonicha/verbose-next-adventure | PASS | PASS | 0 |
| richardokonicha/sunrise | PASS | PASS | 0 |
| sindresorhus/got | FAIL | PASS | 0 |
| remeda/remeda | FAIL | PASS | 0 |
| microsoft/typechat | FAIL | PASS | 0 |

## License

MIT
