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
=== richardokonicha/verbose-next-adventure ===
Baseline done
Agent done: verified=true, attempts=0

=== richardokonicha/sunrise ===
Baseline done
Agent done: verified=true, attempts=0

=== sindresorhus/has-flag ===
Baseline done
Agent done: verified=true, attempts=0

=== sindresorhus/find-up ===
Baseline done
Agent done: verified=true, attempts=0

=== sindresorhus/slash ===
Baseline done
Agent done: verified=true, attempts=0

=== sindresorhus/pretty-bytes ===
Baseline done
Agent done: verified=true, attempts=0

=== Summary ===
richardokonicha/verbose-next-adventure: baseline=FAIL, agent=PASS (0 attempts)
richardokonicha/sunrise: baseline=FAIL, agent=PASS (0 attempts)
sindresorhus/has-flag: baseline=FAIL, agent=PASS (0 attempts)
sindresorhus/find-up: baseline=FAIL, agent=PASS (0 attempts)
sindresorhus/slash: baseline=FAIL, agent=PASS (0 attempts)
sindresorhus/pretty-bytes: baseline=FAIL, agent=PASS (0 attempts)
```

Output files are saved in:
- `output/baseline/` — baseline quickstarts
- `output/agent/` — agent-generated quickstarts
- `trajectories/` — Agent execution traces (JSON)

## Runtime

- **Runtime**: ~60 seconds for full eval across 6 repos
- **Cost**: $0 (no external APIs required)
- **Dependencies**: No external sandbox required; runs locally
