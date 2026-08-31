import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface SandboxPolicy {
  cwd: string;
  timeoutMs: number;
  allowedCommands: string[];
}

export const DEFAULT_SANDBOX: SandboxPolicy = {
  cwd: process.cwd(),
  timeoutMs: 30000,
  allowedCommands: ["npx tsc", "npx eslint"],
};

export async function runInSandbox(command: string, policy: SandboxPolicy = DEFAULT_SANDBOX): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  const lowerCommand = command.toLowerCase();
  const allowed = policy.allowedCommands.some((allowed) => lowerCommand.startsWith(allowed));
  if (!allowed) {
    return {
      stdout: "",
      stderr: `Command blocked by sandbox: ${command}`,
      exitCode: 1,
    };
  }

  try {
    const result = await execAsync(command, {
      cwd: policy.cwd,
      timeout: policy.timeoutMs,
    });
    return { stdout: result.stdout, stderr: result.stderr, exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || error.message,
      exitCode: error.code || 1,
    };
  }
}
