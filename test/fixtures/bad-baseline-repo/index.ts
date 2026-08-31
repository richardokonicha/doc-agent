export function createFixture(name: string, count: number = 1): string {
  return `${name}:${count}`;
}

export function formatOutput(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
