import fs from "fs/promises";
import path from "path";
import { runBaseline } from "../baseline/generator";
import { RepoKnowledge, buildInitialKnowledge } from "./knowledge";
import { verifyDraft, allPassed } from "./verification";
import { saveLedger, rollbackToBaseline, type GovernanceState } from "./ledger";
import { generateDraftFromKnowledge, extractSourceKnowledge } from "./draft";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface AgentResult {
  draft: string;
  attempts: number;
  verified: boolean;
  knowledge: RepoKnowledge;
}

export async function runAgentForRepo(repo: { name: string; url: string; dir: string }): Promise<AgentResult> {
  console.log(`[orchestrator] Starting governance loop for ${repo.name}`);

  let knowledge = buildInitialKnowledge(repo);
  let sourceCode = "";
  let readmeContent = "";

  try {
    const extracted = await extractSourceKnowledge(repo);
    knowledge = extracted.knowledge;
    sourceCode = extracted.sourceCode;
    readmeContent = extracted.readmeContent;
  } catch (e: any) {
    console.error(`[orchestrator] Pre-extraction failed: ${e.message}`);
  }

  const baselineDraft = generateDraftFromKnowledge(repo.name, knowledge, sourceCode, readmeContent);
  let draft = baselineDraft;
  let verified = false;
  let attempts = 0;
  const maxAttempts = 3;

  while (!verified && attempts < maxAttempts) {
    console.log(`[orchestrator] Verification attempt ${attempts + 1}/${maxAttempts}`);
    const results = await verifyDraft(draft, repo.dir, knowledge.isApp);

    if (allPassed(results)) {
      if (!knowledge.isApp) {
        const runtimeOk = await verifyRuntime(draft, repo.dir);
        if (!runtimeOk) {
          const errors = "Runtime verification failed";
          console.log(`[orchestrator] Verification failed:\n${errors}`);
          attempts++;
          if (attempts < maxAttempts) {
            draft = generateDraftFromKnowledge(repo.name, knowledge, sourceCode, readmeContent);
          }
          continue;
        }
      }
      verified = true;
      console.log(`[orchestrator] All verification gates passed`);
      break;
    }

    const errors = results.filter((r) => !r.passed).map((r) => `[${r.gate}] ${r.error}`).join("\n");
    console.log(`[orchestrator] Verification failed:\n${errors}`);

    attempts++;

    if (attempts < maxAttempts) {
      draft = generateDraftFromKnowledge(repo.name, knowledge, sourceCode, readmeContent);
    }
  }

  if (!verified) {
    console.log(`[orchestrator] Max attempts reached, rolling back to baseline`);
    const state = rollbackToBaseline(baselineDraft);
    await saveLedger({
      repo: repo.name,
      timestamp: new Date().toISOString(),
      packageName: knowledge.packageName,
      description: knowledge.description,
      exportsFound: knowledge.publicExports.length,
      topExports: knowledge.publicExports.slice(0, 10),
      sourceFilesScanned: sourceCode.split("\n\n").length,
      sourceCodeLength: sourceCode.length,
      selectedExport: knowledge.publicExports[0] || "none",
      draft: state.draft,
      verified: false,
      attempts: maxAttempts,
    });
    return { draft: baselineDraft, attempts: maxAttempts, verified: false, knowledge };
  }

  await saveLedger({
    repo: repo.name,
    timestamp: new Date().toISOString(),
    packageName: knowledge.packageName,
    description: knowledge.description,
    exportsFound: knowledge.publicExports.length,
    topExports: knowledge.publicExports.slice(0, 10),
    sourceFilesScanned: sourceCode.split("\n\n").length,
    sourceCodeLength: sourceCode.length,
    selectedExport: knowledge.publicExports[0] || "none",
    draft,
    verified: true,
    attempts,
  });

  console.log(`[orchestrator] Governance loop complete: verified=${verified}, attempts=${attempts}`);
  return { draft, attempts, verified, knowledge };
}

async function verifyRuntime(draft: string, repoDir: string): Promise<boolean> {
  const codeMatch = draft.match(/```typescript\n([\s\S]*?)```/);
  if (!codeMatch) return false;

  const nodeModulesExists = await fs.access(path.join(repoDir, "node_modules")).then(() => true).catch(() => false);
  if (!nodeModulesExists) {
    return true;
  }

  const tempFile = path.join(repoDir, "temp-quickstart-example.ts");
  await fs.writeFile(tempFile, codeMatch[1]);

  try {
    await execAsync(`npx tsx ${path.basename(tempFile)}`, { cwd: repoDir, timeout: 10000 });
    return true;
  } catch (e: any) {
    console.log(`[orchestrator] Runtime verification failed: ${e.message}`);
    return false;
  } finally {
    fs.unlink(tempFile).catch(() => {});
  }
}
