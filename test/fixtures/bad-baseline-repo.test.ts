import { runBaseline } from '../../src/baseline/generator';
import { runAgent } from '../../src/agent/index';
import { describe, it, expect } from 'vitest';

const repo = {
  name: 'bad-baseline-repo',
  url: '',
  dir: '/Users/ro/Fugoku/CAREER/micro1hackathon/doc-agent/test/fixtures/bad-baseline-repo',
};

describe('bad-baseline-repo', () => {
  it('baseline should produce broken output on a fixture without a standard main field', async () => {
    const result = await runBaseline(repo);
    expect(result).toContain('```typescript');
    expect(result).toContain('No exports found');
  });

  it('agent should produce verified output on the same fixture', async () => {
    const result = await runAgent(repo);
    expect(result.verified).toBe(true);
    expect(result.draft).toContain('```typescript');
    expect(result.draft).not.toContain('No exports found');
  });
});
