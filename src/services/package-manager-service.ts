import type { PackageManager } from "../ports/package-manager.js";

interface RunOptions {
  manager: "pnpm" | "bun";
  projectDirectory: string;
}

class PackageManagerService implements PackageManager {
  private readonly adapters: Record<string, PackageManager>;

  constructor(adapters: { pnpm: PackageManager; bun: PackageManager }) {
    this.adapters = adapters;
  }

  async specifyDeps(projectDirectory: string): Promise<void> {
    // Default to pnpm
    const { pnpm } = this.adapters;
    if (!pnpm) {
      throw new Error("pnpm adapter not configured");
    }
    await pnpm.specifyDeps(projectDirectory);
  }

  async install(projectDirectory: string): Promise<void> {
    // Default to pnpm
    const { pnpm } = this.adapters;
    if (!pnpm) {
      throw new Error("pnpm adapter not configured");
    }
    await pnpm.install(projectDirectory);
  }

  async run(options: RunOptions): Promise<void> {
    const { manager, projectDirectory } = options;
    const adapter = this.adapters[manager];
    if (!adapter) {
      throw new Error(`Unknown package manager: ${manager}`);
    }
    await adapter.specifyDeps(projectDirectory);
    await adapter.install(projectDirectory);
  }
}

export { PackageManagerService };
export type { RunOptions };
