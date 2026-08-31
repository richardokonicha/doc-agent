import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface EvalResult {
  repo: string;
  baseline: { passed: boolean; attempts: number; output: string };
  agent: { passed: boolean; attempts: number; output: string };
  quality: { score: number; notes: string };
}

export async function runEval(repos: Array<{ name: string; url: string; dir: string }>) {
  const results: EvalResult[] = [];

  for (const repo of repos) {
    console.log(`\n=== Evaluating ${repo.name} ===`);

    const repoDir = repo.dir;
    await fs.mkdir(repoDir, { recursive: true });

    console.log(`Cloning ${repo.name}...`);
    try {
      await execAsync(`git clone --depth 1 ${repo.url} ${repoDir}`, { timeout: 60000 });
    } catch (e: any) {
      console.error(`Failed to clone ${repo.name}:`, e.message);
      continue;
    }

    console.log(`Running baseline for ${repo.name}...`);
    const baselineOutput = await runBaselineForRepo(repo);
    const baselinePassed = await verifyOutput(baselineOutput, repoDir);

    console.log(`Running agent for ${repo.name}...`);
    const agentResult = await runAgentForRepo(repo);
    const agentOutput = agentResult.draft;
    const agentPassed = await verifyOutput(agentOutput, repoDir);

    const quality = scoreQuality(agentOutput);

    results.push({
      repo: repo.name,
      baseline: { passed: baselinePassed, attempts: 0, output: baselineOutput },
      agent: { passed: agentPassed, attempts: agentResult.attempts, output: agentOutput },
      quality,
    });

    console.log(`Result: baseline=${baselinePassed ? "PASS" : "FAIL"}, agent=${agentPassed ? "PASS" : "FAIL"}, quality=${quality.score}/5`);
  }

  return results;
}

async function runBaselineForRepo(repo: { name: string; url: string; dir: string }) {
  const { runBaseline } = await import("../baseline/generator.js");
  return runBaseline(repo);
}

async function runAgentForRepo(repo: { name: string; url: string; dir: string }) {
  const { runAgentForRepo } = await import("../agent/index.js");
  return runAgentForRepo(repo);
}

async function verifyOutput(output: string, repoDir: string): Promise<boolean> {
  const codeMatch = output.match(/```typescript\n([\s\S]*?)```/);
  if (!codeMatch) return false;

  const tempFile = path.join(repoDir, "temp-eval.ts");
  await fs.writeFile(tempFile, codeMatch[1]);

  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);
    await execAsync(`npx tsc --noEmit ${tempFile}`, { timeout: 15000 });
    await execAsync(`npx eslint ${tempFile}`, { timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

function scoreQuality(output: string): { score: number; notes: string } {
  if (!output) return { score: 0, notes: "No output" };

  const hasInstall = output.includes("npm install");
  const hasExample = output.includes("```typescript");
  const hasExplanation = output.includes("# Quickstart") || output.includes("## Example");

  let score = 0;
  if (hasInstall) score += 2;
  if (hasExample) score += 2;
  if (hasExplanation) score += 1;

  return { score, notes: `Install: ${hasInstall}, Example: ${hasExample}, Explanation: ${hasExplanation}` };
}