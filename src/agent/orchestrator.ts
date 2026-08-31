import fs from "fs/promises";
import path from "path";
import { runBaseline } from "../baseline/generator";
import { RepoKnowledge, buildInitialKnowledge } from "./knowledge";
import { verifyDraft, allPassed } from "./verification";
import { saveLedger, rollbackToBaseline, type GovernanceState } from "./ledger";
import { generateDraftFromKnowledge, extractSourceKnowledge } from "./draft";

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
    const results = await verifyDraft(draft, repo.dir);

    if (allPassed(results)) {
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
