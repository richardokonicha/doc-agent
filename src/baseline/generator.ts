import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const readFile = fsPromises.readFile;

function detectPackageManager(dir: string): string {
  const lockfiles = ["pnpm-lock.yaml", "yarn.lock", "bun.lockb"];
  for (const lockfile of lockfiles) {
    try {
      const stats = fs.statSync(path.join(dir, lockfile));
      if (stats.isFile()) {
        if (lockfile === "pnpm-lock.yaml") return "pnpm";
        if (lockfile === "yarn.lock") return "yarn";
        if (lockfile === "bun.lockb") return "bun";
      }
    } catch {
      // file doesn't exist
    }
  }
  return "npm";
}

async function findMainPackage(dir: string): Promise<{ name: string; dir: string } | null> {
  const pkgPath = path.join(dir, "package.json");
  try {
    const content = await readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(content);
    if (!pkg.private) {
      return { name: pkg.name || dir, dir };
    }
  } catch {
    // ignore
  }

  const packagesDir = path.join(dir, "packages");
  try {
    const entries = await fsPromises.readdir(packagesDir);
    entries.sort();
    let unscoped: { name: string; dir: string } | null = null;
    let scoped: { name: string; dir: string } | null = null;
    let bestMatch: { name: string; dir: string } | null = null;
    const repoName = path.basename(dir).toLowerCase();

    for (const entry of entries) {
      const subPkgPath = path.join(packagesDir, entry, "package.json");
      try {
        const content = await readFile(subPkgPath, "utf-8");
        const pkg = JSON.parse(content);
        if (!pkg.private && pkg.name) {
          const pkgName = pkg.name.toLowerCase();
          const shortName = pkgName.replace(/^@[^/]+\//, "");
          if (shortName === repoName) {
            return { name: pkg.name, dir: path.join(packagesDir, entry) };
          }
          if (!bestMatch) bestMatch = { name: pkg.name, dir: path.join(packagesDir, entry) };
          if (!pkg.name.startsWith("@")) {
            unscoped = { name: pkg.name, dir: path.join(packagesDir, entry) };
          } else if (!scoped) {
            scoped = { name: pkg.name, dir: path.join(packagesDir, entry) };
          }
        }
      } catch {
        // ignore
      }
    }
    if (unscoped) return unscoped;
    if (scoped) return scoped;
    if (bestMatch) return bestMatch;
  } catch {
    // no packages dir
  }

  return null;
}

export async function runBaseline(repo: { name: string; url: string; dir: string }): Promise<string> {
  const dir = repo.dir;

  const mainPkg = await findMainPackage(dir);
  const targetDir = mainPkg ? mainPkg.dir : dir;

  const rootPkg = JSON.parse(await readFile(path.join(dir, "package.json"), "utf-8").catch(() => "{}"));
  const packageName = mainPkg ? mainPkg.name : (rootPkg.name || repo.name);

  const readme = await readFile(path.join(targetDir, "README.md"), "utf-8").catch(() => "");
  const pkg = await readFile(path.join(targetDir, "package.json"), "utf-8").catch(() => "{}");

  let exports: string[] = [];
  try {
    const pkgData = JSON.parse(pkg);
    const mainFile = pkgData.main || "index.js";
    let mainPath = path.join(targetDir, mainFile);
    let mainContent = await readFile(mainPath, "utf-8").catch(() => "");

    if (!mainContent) {
      for (const fallback of ["src/index.ts", "src/index.js", "lib/index.ts", "lib/index.js"]) {
        mainContent = await readFile(path.join(targetDir, fallback), "utf-8").catch(() => "");
        if (mainContent) { mainPath = path.join(targetDir, fallback); break; }
      }
    }

    if (!mainContent) {
      const srcDir = path.join(targetDir, "src");
      const libDir = path.join(targetDir, "lib");
      const scanDir = await fsPromises.readdir(srcDir).then(() => srcDir).catch(() => null) || await fsPromises.readdir(libDir).then(() => libDir).catch(() => null);
      if (scanDir) {
        for (const entry of await fsPromises.readdir(scanDir)) {
          if (entry.endsWith(".ts") || entry.endsWith(".js")) {
            mainContent = await readFile(path.join(scanDir, entry), "utf-8").catch(() => "");
            if (mainContent) { mainPath = path.join(scanDir, entry); break; }
          }
        }
      }
    }

    const exportRegex = /export\s+(?:function|const|class|interface|type|enum)\s+(\w+)/g;
    let match;
    while ((match = exportRegex.exec(mainContent)) !== null) {
      exports.push(match[1]);
    }

    const namedExportRegex = /export\s+\{([^}]+)\}/g;
    while ((match = namedExportRegex.exec(mainContent)) !== null) {
      const names = match[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0].trim());
      exports.push(...names.filter((n) => n && !n.startsWith("//")));
    }

    const defaultExportRegex = /export\s+default\s+(?:function|class|const|let|var)\s+(\w+)/g;
    while ((match = defaultExportRegex.exec(mainContent)) !== null) {
      exports.push(match[1]);
    }

    const cjsExportRegex = /(?:module\.exports|exports)\s*=\s*(?:require\([^)]+\)|\{[^}]*\})/g;
    while ((match = cjsExportRegex.exec(mainContent)) !== null) {
      exports.push("default");
    }

    const cjsNamedRegex = /exports\.(\w+)\s*=/g;
    while ((match = cjsNamedRegex.exec(mainContent)) !== null) {
      exports.push(match[1]);
    }
  } catch {
    // ignore
  }

  const description = JSON.parse(pkg).description || "A TypeScript/JavaScript library";

  const template = `# Quickstart

${description}

## Install

\`\`\`bash
npm install ${packageName}
\`\`\`

## Example

\`\`\`typescript
${exports.length > 0 ? `import { ${exports[0]} } from '${packageName}';\n\n// TODO: add a working example` : "// No exports found"}
\`\`\`
`;

  return template;
}