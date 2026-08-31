import dotenv from "dotenv";
dotenv.config();

import { runAgentForRepo } from "./orchestrator";
import { RepoKnowledge } from "./knowledge";

export interface AgentResult {
  draft: string;
  attempts: number;
  verified: boolean;
  knowledge: RepoKnowledge;
}

export async function runAgent(repo: { name: string; url: string; dir: string }): Promise<AgentResult> {
  console.log(`[agent] Starting agent for ${repo.name}...`);
  const result = await runAgentForRepo(repo);
  console.log(`[agent] Agent finished for ${repo.name}: verified=${result.verified}, attempts=${result.attempts}`);
  return result;
}
