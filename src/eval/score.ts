export function scoreQuality(output: string): { score: number; notes: string } {
  if (!output) return { score: 0, notes: "No output" };

  const hasInstall = output.includes("npm install");
  const hasExample = output.includes("```typescript");
  const hasExplanation = output.includes("# Quickstart") || output.includes("## Example");

  let score = 0;
  if (hasInstall) score += 2;
  if (hasExample) score += 2;
  if (hasExplanation) score += 1;

  return { score, notes: `Install: ${hasInstall}, Example: ${hasExample}, Explanation: ${hasExplanation}` };
}