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