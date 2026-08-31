import dotenv from "dotenv";
dotenv.config();

import { runAgentForRepo } from "./orchestrator";

export async function runAgent(repo: { name: string; url: string; dir: string }) {
  console.log(`Starting agent for ${repo.name}...`);
  const result = await runAgentForRepo(repo);
  console.log(`Agent finished for ${repo.name}: verified=${result.verified}, attempts=${result.attempts}`);
  return result;
}

export { runAgentForRepo };

async function main() {
  const repoDir = process.argv[2];

  if (!repoDir) {
    console.error("Usage: npx tsx src/agent/index.ts <repo-dir>");
    console.error("Example: npx tsx src/agent/index.ts /tmp/my-lib");
    process.exit(1);
  }

  const result = await runAgent({
    name: repoDir.split("/").filter(Boolean).pop() || "repo",
    url: "",
    dir: repoDir,
  });

  if (result.verified) {
    console.log("\n=== Verified Quickstart ===");
    console.log(result.draft);
  } else {
    console.log("\n=== Failed after max attempts ===");
    console.log(result.draft);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  });
}
