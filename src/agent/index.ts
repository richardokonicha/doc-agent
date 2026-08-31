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
