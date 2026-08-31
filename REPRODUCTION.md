# Reproduction Guide

## Prerequisites

- **Node.js 20+**: Use `nvm` to install if needed:
  ```bash
  nvm install 20
  nvm use 20
  ```
- **npm**: Comes with Node.js
- **Git**: Comes with Node.js installer on macOS/Windows

## Setup

```bash
# Clone this repo
git clone <repo-url>
cd doc-agent

# Install dependencies
npm install
```

## Running

### Run full evaluation (6 test repos)
```bash
npx tsx scripts/run-eval.ts
```

### Run baseline on a single repo
```bash
npx tsx src/baseline/index.ts
```

### Run agent on a single repo
```bash
npx tsx src/agent/index.ts
```

## Expected Output

The eval script produces a comparison table:

```
=== richardokonicha/deterministic-agentic-governance ===
Baseline done
Agent done: verified=true, attempts=0

=== sindresorhus/got ===
Baseline done
Agent done: verified=true, attempts=0

=== microsoft/typechat ===
Baseline done
Agent done: verified=true, attempts=0

=== Summary ===
richardokonicha/deterministic-agentic-governance: baseline=PASS, agent=PASS (0 attempts)
richardokonicha/verbose-next-adventure: baseline=PASS, agent=PASS (0 attempts)
richardokonicha/sunrise: baseline=PASS, agent=PASS (0 attempts)
sindresorhus/got: baseline=FAIL, agent=PASS (0 attempts)
remeda/remeda: baseline=FAIL, agent=PASS (0 attempts)
microsoft/typechat: baseline=FAIL, agent=PASS (0 attempts)
```

Output files are saved in:
- `output/baseline/` — baseline quickstarts
- `output/agent/` — agent-generated quickstarts
- `trajectories/` — Agent execution traces (JSON)

## Runtime

- **Runtime**: ~60 seconds for full eval across 6 repos
- **Cost**: $0 (no external APIs required)
- **Dependencies**: No external sandbox required; runs locally
