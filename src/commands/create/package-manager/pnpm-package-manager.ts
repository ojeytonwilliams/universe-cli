import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { PackageInstallError } from "../../../errors/cli-errors.js";
import type { PackageManager } from "./package-manager.port.js";

const execFileAsync = promisify(execFile);

interface PnpmRunner {
  installLockfileOnly(cwd: string): Promise<void>;
  list(cwd: string): Promise<string>;
}

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

const defaultFilesystemApi: FilesystemApi = {
  readFile: (path) => readFile(path, "utf8"),
  writeFile: (path, content) => writeFile(path, content, "utf8"),
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

class PnpmPackageManager implements PackageManager {
  private readonly pnpm: PnpmRunner;
  private readonly filesystem: FilesystemApi;

  constructor(
    pnpm: PnpmRunner = defaultPnpmRunner,
    filesystem: FilesystemApi = defaultFilesystemApi,
  ) {
    this.pnpm = pnpm;
    this.filesystem = filesystem;
  }

  async specifyDeps(projectDirectory: string): Promise<void> {
    let listOutput: string;
    try {
      await this.pnpm.installLockfileOnly(projectDirectory);
      listOutput = await this.pnpm.list(projectDirectory);
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
}

export { PnpmPackageManager };
