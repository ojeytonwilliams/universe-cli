import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createPackageSpecifier } from "./package-json-specifier.js";
import type { PackageSpecifier } from "./package-specifier.port.js";

const execFileAsync = promisify(execFile);

interface PnpmRunner {
  installLockfileOnly(cwd: string): Promise<void>;
  list(cwd: string): Promise<string>;
}

interface ListedDependency {
  version: string;
}

interface ListedPackage {
  dependencies?: Record<string, ListedDependency>;
  devDependencies?: Record<string, ListedDependency>;
}

const defaultPnpmRunner: PnpmRunner = {
  async installLockfileOnly(cwd) {
    await execFileAsync("pnpm", ["install", "--lockfile-only"], { cwd, encoding: "utf8" });
  },
  async list(cwd) {
    const { stdout } = await execFileAsync(
      "pnpm",
      ["list", "--json", "--depth=0", "--lockfile-only"],
      { cwd, encoding: "utf8" },
    );
    return stdout;
  },
};

const extractVersions = (listOutput: string): Record<string, string> => {
  const packages = JSON.parse(listOutput) as ListedPackage[];
  const root = packages[0] ?? {};
  const versions: Record<string, string> = {};

  for (const [name, dep] of Object.entries(root.dependencies ?? {})) {
    versions[name] = dep.version;
  }

  for (const [name, dep] of Object.entries(root.devDependencies ?? {})) {
    versions[name] = dep.version;
  }

  return versions;
};

class PnpmPackageManager implements PackageSpecifier {
  private readonly impl: PackageSpecifier;

  constructor(runner: PnpmRunner = defaultPnpmRunner) {
    this.impl = createPackageSpecifier({
      deleteBeforeFirstInstall: false,
      extractVersions,
      lockfileName: "pnpm-lock.yaml",
      runner,
    });
  }

  specifyDeps(projectDirectory: string): Promise<void> {
    return this.impl.specifyDeps(projectDirectory);
  }
}

export { PnpmPackageManager };
