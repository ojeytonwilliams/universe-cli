import { join } from "node:path";
import { PackageInstallError } from "../errors/cli-errors.js";
import type { PackageManager } from "../ports/package-manager.js";

type RunCommand = (command: string, args: string[], cwd: string) => Promise<string>;

interface FilesystemApi {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
}

interface ListedDependency {
  version: string;
}

interface ListedPackage {
  dependencies?: Record<string, ListedDependency>;
  devDependencies?: Record<string, ListedDependency>;
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

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

const pinVersions = (pkg: PackageJson, versions: Record<string, string>): PackageJson => {
  const pin = (deps: Record<string, string>): Record<string, string> =>
    Object.fromEntries(
      Object.entries(deps).map(([name, range]) => [name, versions[name] ?? range]),
    );

  const { dependencies, devDependencies, ...rest } = pkg;
  const pinned: PackageJson = { ...rest };

  if (dependencies !== undefined) {
    pinned.dependencies = pin(dependencies);
  }

  if (devDependencies !== undefined) {
    pinned.devDependencies = pin(devDependencies);
  }

  return pinned;
};

class PnpmPackageManagerAdapter implements PackageManager {
  private readonly run: RunCommand;
  private readonly filesystem: FilesystemApi;

  constructor(run: RunCommand, filesystem: FilesystemApi) {
    this.run = run;
    this.filesystem = filesystem;
  }

  async specifyDeps(projectDirectory: string): Promise<void> {
    try {
      await this.run("pnpm", ["install", "--lockfile-only"], projectDirectory);
    } catch (error) {
      throw new PackageInstallError((error as Error).message);
    }

    let listOutput: string;

    try {
      listOutput = await this.run(
        "pnpm",
        ["list", "--json", "--depth=0", "--lockfile-only"],
        projectDirectory,
      );
    } catch (error) {
      throw new PackageInstallError((error as Error).message);
    }

    const packageJsonPath = join(projectDirectory, "package.json");
    const packageJsonContent = await this.filesystem.readFile(packageJsonPath);
    const pkg = JSON.parse(packageJsonContent) as PackageJson;
    const versions = extractVersions(listOutput);
    const pinned = pinVersions(pkg, versions);

    await this.filesystem.writeFile(packageJsonPath, JSON.stringify(pinned));
  }

  async install(projectDirectory: string): Promise<void> {
    try {
      await this.run("pnpm", ["install"], projectDirectory);
    } catch (error) {
      throw new PackageInstallError((error as Error).message);
    }
  }
}

export { PnpmPackageManagerAdapter };
export type { FilesystemApi, RunCommand };
