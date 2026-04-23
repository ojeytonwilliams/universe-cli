import type { PackageManager } from "./package-manager.port.js";

interface RunOptions {
  manager: "pnpm" | "bun";
  projectDirectory: string;
}

interface PackageSpecifier {
  specifyDeps(options: RunOptions): Promise<void>;
}

class PackageManagerService implements PackageSpecifier {
  private readonly adapters: Record<string, PackageManager>;

  constructor(adapters: { pnpm: PackageManager; bun: PackageManager }) {
    this.adapters = adapters;
  }

  async specifyDeps(options: RunOptions): Promise<void> {
    const { manager, projectDirectory } = options;
    const adapter = this.adapters[manager];
    if (!adapter) {
      throw new Error(`Unknown package manager: ${manager}`);
    }
    await adapter.specifyDeps(projectDirectory);
  }
}

export { PackageManagerService };
export type { PackageSpecifier as PackageManagerRunner, RunOptions };
