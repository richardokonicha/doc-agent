import fs from "fs/promises";
import path from "path";
import { runInSandbox } from "./sandbox";

export interface VerificationResult {
  passed: boolean;
  gate: string;
  error?: string;
}

export async function verifyDraft(draft: string, repoDir: string): Promise<VerificationResult[]> {
  const codeMatch = draft.match(/```typescript\n([\s\S]*?)```/);
  if (!codeMatch) {
    return [{ passed: false, gate: "structure", error: "No TypeScript code block found in draft" }];
  }

  const code = codeMatch[1];
  const pkgPath = path.join(repoDir, "package.json");
  let packageName = "";
  try {
    const pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8"));
    packageName = pkg.name || "";
  } catch {}

  const results: VerificationResult[] = [];

  if (packageName && !code.includes(packageName)) {
    results.push({
      passed: false,
      gate: "import",
      error: `Code doesn't import package ${packageName}`,
    });
  }

  if (code.includes("TODO:") || code.includes("FIXME:")) {
    results.push({
      passed: false,
      gate: "quality",
      error: "Code contains TODO/FIXME comments",
    });
  }

  return results;
}

export function allPassed(results: VerificationResult[]): boolean {
  return results.every((r) => r.passed);
}
