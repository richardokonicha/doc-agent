export interface RepoKnowledge {
  packageName: string;
  description: string;
  buildScript: string;
  packageManager: string;
  publicExports: string[];
  testFiles: string[];
  isApp: boolean;
}

export function buildInitialKnowledge(repo: { name: string; url: string; dir: string }): RepoKnowledge {
  return {
    packageName: repo.name,
    description: "",
    buildScript: "npm run build",
    packageManager: "npm",
    publicExports: [],
    testFiles: [],
    isApp: false,
  };
}
