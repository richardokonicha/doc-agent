import { runBaselineForRepo } from '../src/baseline/index';
import { runAgent } from '../src/agent/index';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  const repoDir = process.argv[2];

  if (!repoDir) {
    console.error('Usage: npx tsx scripts/run.ts <repo-dir>');
    console.error('Example: npx tsx scripts/run.ts /tmp/my-lib');
    process.exit(1);
  }

  const absoluteDir = path.resolve(repoDir);
  const exists = await fs.access(absoluteDir).then(() => true).catch(() => false);
  if (!exists) {
    console.error(`Error: Directory does not exist: ${absoluteDir}`);
    process.exit(1);
  }

  const pkgPath = path.join(absoluteDir, 'package.json');
  const pkgExists = await fs.access(pkgPath).then(() => true).catch(() => false);
  if (!pkgExists) {
    console.error(`Error: No package.json found in ${absoluteDir}`);
    process.exit(1);
  }

  const repo = {
    name: path.basename(absoluteDir),
    url: '',
    dir: absoluteDir,
  };

  console.log(`Running baseline on ${repo.name}...`);
  let baselineOutput = '';
  try {
    baselineOutput = await runBaselineForRepo(repo);
    console.log('Baseline done');
  } catch (e: any) {
    console.error(`Baseline failed: ${e.message}`);
  }

  console.log(`Running agent on ${repo.name}...`);
  let agentResult: any = { draft: '', attempts: 0, verified: false };
  try {
    agentResult = await runAgent(repo);
    console.log(`Agent done: verified=${agentResult.verified}, attempts=${agentResult.attempts}`);
  } catch (e: any) {
    console.error(`Agent failed: ${e.message}`);
  }

  console.log('\n=== Summary ===');
  console.log(`Baseline: ${baselineOutput ? 'PASS' : 'FAIL'}`);
  console.log(`Agent: ${agentResult.verified ? 'PASS' : 'FAIL'} (${agentResult.attempts} attempts)`);
}

main().catch(e => console.error('Error:', e.message));
