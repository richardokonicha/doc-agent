import { runBaseline } from "./generator";
import fs from "fs/promises";
import path from "path";

export async function runBaselineForRepo(repo: { name: string; url: string; dir: string }) {
  console.log(`Running baseline for ${repo.name}...`);
  const result = await runBaseline(repo);
  const outputDir = path.join(process.cwd(), "output", "baseline");
  await fs.mkdir(outputDir, { recursive: true });
  const safeName = repo.name.replace(/\//g, "_");
  await fs.writeFile(path.join(outputDir, `${safeName}-QUICKSTART.md`), result);
  console.log(`Baseline done for ${repo.name}`);
  return result;
}

async function main() {
  const repoDir = process.argv[2];

  if (!repoDir) {
    console.error("Usage: npx tsx src/baseline/index.ts <repo-dir>");
    console.error("Example: npx tsx src/baseline/index.ts /tmp/my-lib");
    process.exit(1);
  }

  const repo = {
    name: path.basename(path.resolve(repoDir)),
    url: "",
    dir: path.resolve(repoDir),
  };

  await runBaselineForRepo(repo);
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});