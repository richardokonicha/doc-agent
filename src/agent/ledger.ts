import fs from "fs/promises";
import path from "path";

export interface LedgerEntry {
  repo: string;
  timestamp: string;
  packageName: string;
  description: string;
  exportsFound: number;
  topExports: string[];
  sourceFilesScanned: number;
  sourceCodeLength: number;
  selectedExport: string;
  draft: string;
  verified: boolean;
  attempts: number;
}

export async function saveLedger(entry: LedgerEntry, outputDir?: string): Promise<void> {
  const dir = outputDir || path.join(process.cwd(), "trajectories");
  await fs.mkdir(dir, { recursive: true });
  const safeName = entry.repo.replace(/\//g, "_").replace(/\./g, "_");
  const filePath = path.join(dir, `${safeName}.json`);
  await fs.writeFile(filePath, JSON.stringify(entry, null, 2));
}

export async function loadLedger(repo: string, outputDir?: string): Promise<LedgerEntry | null> {
  const dir = outputDir || path.join(process.cwd(), "trajectories");
  const safeName = repo.replace(/\//g, "_").replace(/\./g, "_");
  const filePath = path.join(dir, `${safeName}.json`);

  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as LedgerEntry;
  } catch {
    return null;
  }
}

export interface GovernanceState {
  repo: string;
  knowledge: Record<string, unknown>;
  draft: string;
  attempts: number;
  verified: boolean;
  lastError: string;
}

export function rollbackToBaseline(baseline: string): GovernanceState {
  return {
    repo: "rollback",
    knowledge: {},
    draft: baseline,
    attempts: 0,
    verified: true,
    lastError: "Agent failed after max attempts; rolled back to baseline",
  };
}
