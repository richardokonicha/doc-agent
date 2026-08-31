import { runAgentForRepo } from "./agent/index";
import { runBaselineForRepo } from "./baseline/index";
import { runEval } from "./eval/harness";

const TEST_REPOS = [
  { name: "richardokonicha/deterministic-agentic-governance", url: "https://github.com/richardokonicha/deterministic-agentic-governance.git", dir: "/tmp/doc-agent/governance" },
  { name: "richardokonicha/verbose-next-adventure", url: "https://github.com/richardokonicha/verbose-next-adventure.git", dir: "/tmp/doc-agent/verbose" },
  { name: "richardokonicha/sunrise", url: "https://github.com/richardokonicha/sunrise.git", dir: "/tmp/doc-agent/sunrise" },
];

async function main() {
  console.log("doc-agent — micro1 Frontier Engineering Challenge 2026");
  console.log("Starting evaluation...\n");

  const results = await runEval(TEST_REPOS);

  console.log("\n=== Results ===");
  for (const result of results) {
    console.log(
      `${result.repo}: baseline=${result.baseline.passed ? "PASS" : "FAIL"}, agent=${result.agent.passed ? "PASS" : "FAIL"}, quality=${result.quality.score}/5`
    );
  }
}

main().catch(console.error);