import { runBaseline } from '../src/baseline/generator';
import { runAgent } from '../src/agent/index';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const repos = [
  { name: 'richardokonicha/deterministic-agentic-governance', url: 'https://github.com/richardokonicha/deterministic-agentic-governance.git', dir: '/tmp/doc-agent/governance' },
  { name: 'richardokonicha/verbose-next-adventure', url: 'https://github.com/richardokonicha/verbose-next-adventure.git', dir: '/tmp/doc-agent/verbose' },
  { name: 'richardokonicha/sunrise', url: 'https://github.com/richardokonicha/sunrise.git', dir: '/tmp/doc-agent/sunrise' },
  { name: 'sindresorhus/got', url: 'https://github.com/sindresorhus/got.git', dir: '/tmp/doc-agent/got' },
  { name: 'remeda/remeda', url: 'https://github.com/remeda/remeda.git', dir: '/tmp/doc-agent/remeda' },
  { name: 'microsoft/typechat', url: 'https://github.com/microsoft/typechat.git', dir: '/tmp/doc-agent/typechat' },
];

async function main() {
  const results = [];
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
        try {
          await fs.rm(repo.dir, { recursive: true, force: true });
          await execAsync(`git clone ${repo.url} ${repo.dir}`, { timeout: 60000 });
        } catch (e2: any) {
          console.error(`Retry failed: ${e2.message}`);
          continue;
        }
      }
    } else {
      console.log(`Already cloned ${repo.name}`);
    }

    console.log(`Running baseline...`);
    let baselineOutput = '';
    try {
      baselineOutput = await runBaseline(repo);
      console.log('Baseline done');
      const baselineDir = path.join(process.cwd(), 'output', 'baseline');
      await fs.mkdir(baselineDir, { recursive: true });
      const safeName = repo.name.replace(/\//g, '_');
      await fs.writeFile(path.join(baselineDir, `${safeName}-QUICKSTART.md`), baselineOutput);
    } catch (e: any) {
      console.error(`Baseline failed: ${e.message}`);
    }

    console.log(`Running agent...`);
    let agentResult: any = { draft: '', attempts: 0, verified: false };
    try {
      agentResult = await runAgent(repo);
      console.log(`Agent done: verified=${agentResult.verified}, attempts=${agentResult.attempts}`);
      if (agentResult.draft) {
        const agentDir = path.join(process.cwd(), 'output', 'agent');
        await fs.mkdir(agentDir, { recursive: true });
        const safeName = repo.name.replace(/\//g, '_');
        await fs.writeFile(path.join(agentDir, `${safeName}-QUICKSTART.md`), agentResult.draft);
      }
    } catch (e: any) {
      console.error(`Agent failed: ${e.message}`);
    }

    results.push({
      repo: repo.name,
      baseline: { output: baselineOutput, passed: baselineOutput.includes('```typescript') && !baselineOutput.includes('// No exports found') },
      agent: { output: agentResult.draft, passed: agentResult.verified, attempts: agentResult.attempts },
    });
  }

  console.log('\n=== Summary ===');
  for (const r of results) {
    console.log(`${r.repo}: baseline=${r.baseline.passed ? 'PASS' : 'FAIL'}, agent=${r.agent.passed ? 'PASS' : 'FAIL'} (${r.agent.attempts} attempts)`);
  }
}

main().catch(e => console.error('Error:', e.message));
