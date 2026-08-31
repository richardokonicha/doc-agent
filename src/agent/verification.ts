import fs from "fs/promises";
import path from "path";
import { DEFAULT_SANDBOX, runInSandbox } from "./sandbox";

export interface VerificationResult {
  passed: boolean;
  gate: string;
  error?: string;
}

export async function verifyDraft(draft: string, repoDir: string, isApp: boolean = false): Promise<VerificationResult[]> {
  const codeMatch = draft.match(/```typescript\n([\s\S]*?)```/);
  const results: VerificationResult[] = [];

  if (isApp) {
    if (!draft.includes("npm install") && !draft.includes("pnpm install") && !draft.includes("yarn install") && !draft.includes("bun install")) {
      results.push({ passed: false, gate: "structure", error: "App quickstart missing install command" });
    }
    if (!draft.includes("npm run dev") && !draft.includes("npm run start") && !draft.includes("localhost")) {
      results.push({ passed: false, gate: "structure", error: "App quickstart missing run command" });
    }
    return results;
  }

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

  const tempFile = path.join(repoDir, "temp-quickstart-example.ts");
  await fs.writeFile(tempFile, code);

  try {
    const tscResult = await runTypeCheckGate(tempFile, repoDir);
    results.push(tscResult);

    if (tscResult.passed) {
      const eslintResult = await runLintGate(tempFile, repoDir);
      results.push(eslintResult);
    }
  } finally {
    fs.unlink(tempFile).catch(() => {});
  }

  return results;
}

async function runTypeCheckGate(filePath: string, cwd: string): Promise<VerificationResult> {
  const nodeModulesExists = await fs.access(path.join(cwd, "node_modules")).then(() => true).catch(() => false);
  if (!nodeModulesExists) {
    return { passed: true, gate: "typescript" };
  }

  const tempConfig = path.join(cwd, "temp-tsconfig-check.json");
  const tempTsx = path.join(cwd, "temp-quickstart-example.ts");
  await fs.writeFile(tempConfig, JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      noEmit: true,
    },
    include: [path.basename(tempTsx)],
  }));

  const result = await runInSandbox(`npx tsc --project ${path.basename(tempConfig)}`, {
    ...DEFAULT_SANDBOX,
    cwd,
  });

  fs.unlink(tempConfig).catch(() => {});

  if (result.exitCode !== 0) {
    return {
      passed: false,
      gate: "typescript",
      error: result.stderr || result.stdout || "TypeScript check failed",
    };
  }

  return { passed: true, gate: "typescript" };
}

async function runLintGate(filePath: string, cwd: string): Promise<VerificationResult> {
  const nodeModulesExists = await fs.access(path.join(cwd, "node_modules")).then(() => true).catch(() => false);
  if (!nodeModulesExists) {
    return { passed: true, gate: "eslint" };
  }

  const result = await runInSandbox(`npx eslint ${path.basename(filePath)}`, {
    ...DEFAULT_SANDBOX,
    cwd,
  });

  if (result.exitCode !== 0) {
    return {
      passed: false,
      gate: "eslint",
      error: result.stderr || result.stdout || "ESLint check failed",
    };
  }

  return { passed: true, gate: "eslint" };
}

export function allPassed(results: VerificationResult[]): boolean {
  return results.every((r) => r.passed);
}
