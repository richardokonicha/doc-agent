# 5-Minute Demo Video Script

## Shot 1: Problem (0:00 - 0:45)
- Show a typical README with stale/incomplete examples
- Show a developer struggling to get started with a TS library
- Text overlay: "New developers waste 1-3 hours trial-and-erroring imports and setup"

## Shot 2: Solution Overview (0:45 - 1:15)
- Introduce doc-agent
- Show the governance loop: extract → score → draft → verify → commit/rollback
- Text overlay: "Agentic quickstart generation for TypeScript/JavaScript libraries"

## Shot 3: Live Demo - Baseline vs Agent (1:15 - 2:30)
- Run `npx tsx scripts/run-eval.ts`
- Show baseline failing on `sindresorhus/got`, `remeda/remeda`, `microsoft/typechat`
- Show agent passing on all 6 repos
- Highlight: 0 attempts for most repos, governance loop with verification gates

## Shot 4: Repo-Specific Outputs (2:30 - 3:30)
- Show generated quickstarts for different repos:
  - governance: `createGovernanceConfig` from `@deterministic-agentic/governance`
  - got: `create` from `got`
  - typechat: `TypeChat` from `@microsoft/typechat`
- Highlight: each output uses the actual package name and real exports

## Shot 5: Trajectories & Evidence (3:30 - 4:15)
- Show `trajectories/` directory
- Open one trajectory JSON
- Highlight: exports found, source files scanned, verification status
- Show comparison table from eval output

## Shot 6: Key Features & Results (4:15 - 4:45)
- Summarize: works offline, no external API required, 0 cost
- Table showing baseline fails 3/6, agent passes 6/6
- Mention: handles monorepos, workspaces, arrow functions, generics

## Shot 7: Closing (4:45 - 5:00)
- Show repo structure
- Call to action: "Check the code, run the eval, contribute"
- End screen with project name and hackathon

## Recording Tips
- Use terminal with dark theme for visibility
- Zoom into code blocks when showing generated quickstarts
- Keep mouse movements smooth
- Speak clearly, explain what's happening at each step
- Total runtime: ~4:30-5:00
