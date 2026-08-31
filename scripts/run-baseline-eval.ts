import { runBaseline } from '../src/baseline/generator';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const repos = [
  { name: 'richardokonicha/deterministic-agentic-governance', url: 'https://github.com/richardokonicha/deterministic-agentic-governance.git', dir: '/tmp/doc-agent/governance' },
  { name: 'richardokonicha/verbose-next-adventure', url: 'https://github.com/richardokonicha/verbose-next-adventure.git', dir: '/tmp/doc-agent/verbose' },
  { name: 'richardokonicha/sunrise', url: 'https://github.com/richardokonicha/sunrise.git', dir: '/tmp/doc-agent/sunrise' },
];

async function main() {
  for (const repo of repos) {
    console.log(`\n=== ${repo.name} ===`);
    await fs.mkdir(repo.dir, { recursive: true });

    const pkgPath = `${repo.dir}/package.json`;
    const exists = await fs.access(pkgPath).then(() => true).catch(() => false);
    if (!exists) {
      console.log(`Cloning ${repo.name}...`);
      try {
        await execAsync(`git clone ${repo.url} ${repo.dir}`, { timeout: 60000 });
      } catch (e: any) {
        console.error(`Failed: ${e.message}`);
        continue;
      }
    } else {
      console.log(`Already cloned ${repo.name}`);
    }

    console.log(`Running baseline...`);
    try {
      const output = await runBaseline(repo);
      console.log(output.slice(0, 500));
    } catch (e: any) {
      console.error(`Baseline failed: ${e.message}`);
    }
  }
}

main().catch(e => console.error('Error:', e.message));
