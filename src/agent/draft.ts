import fs from "fs/promises";
import path from "path";
import { RepoKnowledge, buildInitialKnowledge } from "./knowledge";

export interface SourceKnowledge {
  knowledge: RepoKnowledge;
  sourceCode: string;
  readmeContent: string;
}

export async function extractSourceKnowledge(repo: { name: string; url: string; dir: string }): Promise<SourceKnowledge> {
  const knowledge = buildInitialKnowledge(repo);
  let sourceCode = "";
  let readmeContent = "";

  const pkgPath = path.join(repo.dir, "package.json");
  const pkgContent = await fs.readFile(pkgPath, "utf-8").catch(() => "{}");
  const pkg = JSON.parse(pkgContent);
  knowledge.packageName = pkg.name || repo.name;
  knowledge.description = pkg.description || "";
  knowledge.buildScript = pkg.scripts?.build || "npm run build";
  knowledge.packageManager = pkg.packageManager?.split("@")[0] || "npm";

  readmeContent = await fs.readFile(path.join(repo.dir, "README.md"), "utf-8").catch(() => "");

  let targetDir = repo.dir;
  if (pkg.workspaces && Array.isArray(pkg.workspaces)) {
    for (const workspace of pkg.workspaces) {
      const wsDir = path.join(repo.dir, workspace);
      try {
        const wsPkgPath = path.join(wsDir, "package.json");
        const wsPkgContent = await fs.readFile(wsPkgPath, "utf-8");
        const wsPkg = JSON.parse(wsPkgContent);
        if (wsPkg.name && (wsPkg.name === knowledge.packageName || wsPkg.name.includes(knowledge.packageName.replace(/^@[^/]+\//, "")))) {
          targetDir = wsDir;
          knowledge.packageName = wsPkg.name;
          knowledge.description = wsPkg.description || knowledge.description;
          break;
        }
      } catch {}
    }
  }

  function resolveEntryPoint(pkg: any, dir: string): string | null {
    if (pkg.main) return path.join(dir, pkg.main);
    if (pkg.module) return path.join(dir, pkg.module);
    if (pkg.types) return path.join(dir, pkg.types);
    
    if (pkg.exports) {
      const exportsField = pkg.exports;
      if (typeof exportsField === "string") {
        return path.join(dir, exportsField);
      }
      if (typeof exportsField === "object") {
        const conditions = ["import", "default", "types", "require"];
        for (const condition of conditions) {
          if (exportsField[condition]) {
            return path.join(dir, exportsField[condition]);
          }
        }
        const firstKey = Object.keys(exportsField)[0];
        if (firstKey) {
          return path.join(dir, exportsField[firstKey]);
        }
      }
    }
    
    return null;
  }

  const mainFile = resolveEntryPoint(pkg, targetDir) || path.join(targetDir, "index.ts");
  const mainPath = mainFile;
  sourceCode = await fs.readFile(mainPath, "utf-8").catch(() => "");

  if (!sourceCode) {
    const srcDir = path.join(targetDir, "src");
    try {
      const files = await fs.readdir(srcDir);
      for (const file of files) {
        if (file.endsWith(".ts") || file.endsWith(".js")) {
          sourceCode = await fs.readFile(path.join(srcDir, file), "utf-8");
          if (sourceCode) break;
        }
      }
    } catch {}
  }

  if (!sourceCode || (sourceCode.includes("from '") || sourceCode.includes('from "'))) {
    const allSourceFiles: string[] = [];
    const searchDirs = ["src", "lib", "app", "components", "source"];
    for (const dir of searchDirs) {
      const dirPath = path.join(targetDir, dir);
      try {
        async function readTsFiles(d: string): Promise<void> {
          const entries = await fs.readdir(d, { withFileTypes: true });
          for (const entry of entries) {
            const full = path.join(d, entry.name);
            if (entry.isDirectory() && !entry.name.includes("node_modules") && !entry.name.includes(".git")) {
              await readTsFiles(full);
            } else if ((entry.name.endsWith(".ts") || entry.name.endsWith(".js") || entry.name.endsWith(".tsx")) && !entry.name.endsWith(".d.ts")) {
              const content = await fs.readFile(full, "utf-8");
              allSourceFiles.push(content);
            }
          }
        }
        await readTsFiles(dirPath);
      } catch {}
    }

    if (allSourceFiles.length > 0) {
      sourceCode = allSourceFiles.join("\n\n");
    }
  }

  const exportRegex = /export\s+(?:(?:async\s+)?(?:function|const|class|interface|type|enum)|default\s+(?:function|class|const))\s+(\w+)/g;
  let match;
  while ((match = exportRegex.exec(sourceCode)) !== null) {
    knowledge.publicExports.push(match[1]);
  }

  const defaultExportRegex = /export\s+default\s+(\w+)\s*[;,(]/g;
  while ((match = defaultExportRegex.exec(sourceCode)) !== null) {
    if (!knowledge.publicExports.includes(match[1])) {
      knowledge.publicExports.push(match[1]);
    }
  }

  const namedExportRegex = /export\s+\{([^}]+)\}/g;
  while ((match = namedExportRegex.exec(sourceCode)) !== null) {
    const names = match[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0].trim());
    knowledge.publicExports.push(...names.filter((n) => n && !n.startsWith("//")));
  }

  try {
    const testFiles: string[] = [];
    async function findTests(d: string): Promise<void> {
      const entries = await fs.readdir(d, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory() && !entry.name.includes("node_modules") && !entry.name.includes(".git")) {
          await findTests(full);
        } else if (entry.name.includes(".test.") || entry.name.includes(".spec.")) {
          testFiles.push(full);
        }
      }
    }
    await findTests(repo.dir);
    knowledge.testFiles = testFiles;
  } catch {}

  return { knowledge, sourceCode, readmeContent };
}

export function generateDraftFromKnowledge(repoName: string, knowledge: RepoKnowledge, sourceCode: string, readme: string): string {
  const description = knowledge.description || "A TypeScript/JavaScript library";
  const packageName = knowledge.packageName || repoName;
  const exports = knowledge.publicExports;

  let mainExport = exports[0] || "default";
  let exampleCode = "";

  if (exports.length > 0) {
    const scoredExports = exports.map((exp) => {
      let score = 0;
      const lower = exp.toLowerCase();
      const pkgLower = packageName.toLowerCase().replace(/^@[^/]+\//, "");

      if (lower.includes(pkgLower)) score += 10;
      if (/^(create|init|new|build|make|get|run|start|with)/.test(exp)) score += 5;
      if (exp.length < 15) score += 2;
      if (lower.includes("adapter") || lower.includes("manager") || lower.includes("context")) score -= 3;
      score += Math.max(0, 10 - exports.indexOf(exp));

      return { export: exp, score };
    });

    scoredExports.sort((a, b) => b.score - a.score);
    const exportName = scoredExports[0]?.export || exports[0];

    const funcMatch = sourceCode.match(new RegExp(String.raw`export\s+(?:default\s+)?(?:async\s+)?function\s+${exportName}(?:\s*<[^>]*>)?\s*\(([^)]*)\)`, "i"));
    const classMatch = sourceCode.match(new RegExp(String.raw`export\s+(?:default\s+)?class\s+${exportName}(?::\s*\w+)?\s*\{`, "i"));
    const arrowMatch = sourceCode.match(new RegExp(String.raw`(?:export\s+(?:default\s+)?)?(?:const|let|var)\s+${exportName}\s*=\s*(?:async\s*)?\(([^)]*)\)`, "i"));
    const importPath = packageName;

    if (funcMatch) {
      const params = funcMatch[1].trim();
      const paramList = params ? params.split(",").map((p) => p.split(":").map((s) => s.trim())[0]).filter(Boolean) : [];

      const exampleParams = paramList
        .map((p) => {
          const lower = p.toLowerCase();
          if (lower.includes("path")) return `"./workspace"`;
          if (lower.includes("name") || lower.includes("project")) return `"my-project"`;
          if (lower.includes("config")) return `{ type: "default" }`;
          if (lower.includes("options")) return `{}`;
          if (lower.includes("url")) return `"https://example.com"`;
          if (lower.includes("key")) return `"your-api-key"`;
          if (lower.includes("data")) return `{}`;
          if (lower.includes("message")) return `"Hello"`;
          if (lower.includes("id")) return `"123"`;
          return `"${p}"`;
        })
        .join(", ");

      if (exportName.startsWith("create") || exportName.startsWith("init") || exportName.startsWith("new")) {
        exampleCode = `import { ${exportName} } from '${importPath}';\n\nconst instance = await ${exportName}(${exampleParams});\nconsole.log(instance);`;
      } else if (exportName.startsWith("run") || exportName.startsWith("execute") || exportName.startsWith("start")) {
        exampleCode = `import { ${exportName} } from '${importPath}';\n\nawait ${exportName}(${exampleParams});\nconsole.log('Done');`;
      } else if (exportName.startsWith("get") || exportName.startsWith("fetch") || exportName.startsWith("find")) {
        exampleCode = `import { ${exportName} } from '${importPath}';\n\nconst result = await ${exportName}(${exampleParams});\nconsole.log(result);`;
      } else if (exportName.startsWith("with")) {
        exampleCode = `import { ${exportName} } from '${importPath}';\n\nconst handler = ${exportName}(${exampleParams});\nconsole.log(handler);`;
      } else {
        exampleCode = `import { ${exportName} } from '${importPath}';\n\nconst result = ${exportName}(${exampleParams});\nconsole.log(result);`;
      }
    } else if (arrowMatch) {
      const params = arrowMatch[1].trim();
      const paramList = params ? params.split(",").map((p) => p.split(":").map((s) => s.trim())[0]).filter(Boolean) : [];

      const exampleParams = paramList
        .map((p) => {
          const lower = p.toLowerCase();
          if (lower.includes("path")) return `"./workspace"`;
          if (lower.includes("name") || lower.includes("project")) return `"my-project"`;
          if (lower.includes("config")) return `{ type: "default" }`;
          if (lower.includes("options")) return `{}`;
          if (lower.includes("url")) return `"https://example.com"`;
          if (lower.includes("key")) return `"your-api-key"`;
          if (lower.includes("data")) return `{}`;
          if (lower.includes("message")) return `"Hello"`;
          if (lower.includes("id")) return `"123"`;
          return `"${p}"`;
        })
        .join(", ");

      if (exportName.startsWith("create") || exportName.startsWith("init") || exportName.startsWith("new")) {
        exampleCode = `import { ${exportName} } from '${importPath}';\n\nconst instance = await ${exportName}(${exampleParams});\nconsole.log(instance);`;
      } else if (exportName.startsWith("run") || exportName.startsWith("execute") || exportName.startsWith("start")) {
        exampleCode = `import { ${exportName} } from '${importPath}';\n\nawait ${exportName}(${exampleParams});\nconsole.log('Done');`;
      } else if (exportName.startsWith("get") || exportName.startsWith("fetch") || exportName.startsWith("find")) {
        exampleCode = `import { ${exportName} } from '${importPath}';\n\nconst result = await ${exportName}(${exampleParams});\nconsole.log(result);`;
      } else if (exportName.startsWith("with")) {
        exampleCode = `import { ${exportName} } from '${importPath}';\n\nconst handler = ${exportName}(${exampleParams});\nconsole.log(handler);`;
      } else {
        exampleCode = `import { ${exportName} } from '${importPath}';\n\nconst result = ${exportName}(${exampleParams});\nconsole.log(result);`;
      }
    } else if (classMatch) {
      const factoryMatch = sourceCode.match(
        new RegExp(String.raw`export\s+(?:async\s+)?function\s+(?:create|init|new|build|make)${exportName}\s*\(([^)]*)\)`, "i")
      );
      if (factoryMatch) {
        const params = factoryMatch[1].trim();
        const paramList = params ? params.split(",").map((p) => p.split(":").map((s) => s.trim())[0]).filter(Boolean) : [];
        const exampleParams = paramList
          .map((p) => {
            const lower = p.toLowerCase();
            if (lower.includes("path")) return `"./workspace"`;
            if (lower.includes("name") || lower.includes("project")) return `"my-project"`;
            if (lower.includes("config")) return `{ type: "default" }`;
            if (lower.includes("options")) return `{}`;
            return `"${p}"`;
          })
          .join(", ");

        const factoryName =
          sourceCode
            .match(new RegExp(String.raw`export\s+(?:async\s+)?function\s+(?:create|init|new|build|make)${exportName}`))?.[0]
            ?.match(/function\s+(\w+)/)?.[1] || `create${exportName}`;
        exampleCode = `import { ${factoryName} } from '${importPath}';\n\nconst instance = await ${factoryName}(${exampleParams});\nconsole.log(instance);`;
      } else {
        const ctorMatch = sourceCode.match(new RegExp(String.raw`class\s+${exportName}[^{]*constructor\s*\(([^)]*)\)`));
        if (ctorMatch) {
          const params = ctorMatch[1].trim();
          const paramList = params ? params.split(",").map((p) => p.split(":").map((s) => s.trim())[0]).filter(Boolean) : [];
          const exampleParams = paramList
            .map((p) => {
              const lower = p.toLowerCase();
              if (lower.includes("path")) return `"./workspace"`;
              if (lower.includes("name") || lower.includes("project")) return `"my-project"`;
              if (lower.includes("config")) return `{ type: "default" }`;
              if (lower.includes("options")) return `{}`;
              return `"${p}"`;
            })
            .join(", ");
          exampleCode = `import { ${exportName} } from '${importPath}';\n\nconst instance = new ${exportName}(${exampleParams});\nconsole.log(instance);`;
        } else {
          exampleCode = `import { ${exportName} } from '${importPath}';\n\n// TODO: Check README for constructor params\nconst instance = new ${exportName}();\nconsole.log(instance);`;
        }
      }
    } else {
      const constMatch = sourceCode.match(new RegExp(String.raw`export\s+(?:const|let|var)\s+${exportName}\s*[:=]`, "i"));
      const typeMatch = sourceCode.match(new RegExp(String.raw`export\s+(?:type|interface)\s+${exportName}`, "i"));
      
      if (constMatch) {
        const valueMatch = sourceCode.match(new RegExp(String.raw`export\s+(?:const|let|var)\s+${exportName}\s*=\s*([^;]+)`, "i"));
        if (valueMatch) {
          exampleCode = `import { ${exportName} } from '${importPath}';\n\nconsole.log(${exportName});`;
        } else {
          exampleCode = `import { ${exportName} } from '${importPath}';\n\n// Use ${exportName} in your code\nconsole.log(${exportName});`;
        }
      } else if (typeMatch) {
        exampleCode = `import { ${exportName} } from '${importPath}';\n\n// Use ${exportName} as a type\nconst value: ${exportName} = {} as any;\nconsole.log(value);`;
      } else {
        exampleCode = `import { ${exportName} } from '${importPath}';\n\n// TODO: Check README for usage\nconsole.log('Loaded ${exportName}');`;
      }
    }
  } else {
    exampleCode = `// No exports found - check package.json for usage`;
  }

  const explanation = knowledge.description || `This example demonstrates how to use the main export from ${packageName}.`;

  return `# Quickstart

${description}

## Install

\`\`\`bash
npm install ${packageName}
\`\`\`

## Example

\`\`\`typescript
${exampleCode}
\`\`\`

## What This Does

${explanation}

The example imports the \`${mainExport}\` export and demonstrates basic usage. Check the source code and tests for more advanced examples.`;
}
