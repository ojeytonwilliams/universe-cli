import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { PackageInstallError } from "../errors/cli-errors.js";
import type { PackageManager } from "../ports/package-manager.js";

const execFileAsync = promisify(execFile);

const defaultRun = async (command: string, args: string[], cwd: string): Promise<string> => {
  const { stdout } = await execFileAsync(command, args, { cwd, encoding: "utf8" });
  return stdout;
};

const defaultFilesystemApi = {
  readFile: (path: string) => readFile(path, "utf8"),
  writeFile: (path: string, content: string) => writeFile(path, content, "utf8"),
};

const extractVersions = (listOutput: string): Record<string, string> => {
  let data: unknown;
  try {
    data = JSON.parse(listOutput);
  } catch {
    return {};
  }
  const versions: Record<string, string> = {};
  if (Array.isArray(data)) {
    for (const dep of data) {
      if (
        typeof dep === "object" &&
        dep !== null &&
        "name" in dep &&
        typeof (dep as { name?: unknown }).name === "string" &&
        "version" in dep &&
        typeof (dep as { version?: unknown }).version === "string"
      ) {
        const { name, version } = dep as { name: string; version: string };
        versions[name] = version;
      }
    }
  }
  return versions;
};
interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

const pinVersions = (pkg: PackageJson, versions: Record<string, string>): PackageJson => {
  const pin = (deps: Record<string, string> = {}) =>
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

class BunPackageManagerAdapter implements PackageManager {
  private readonly run;
  private readonly filesystem;

  constructor(
    run: typeof defaultRun = defaultRun,
    filesystem: typeof defaultFilesystemApi = defaultFilesystemApi,
  ) {
    this.run = run;
    this.filesystem = filesystem;
  }

  async specifyDeps(projectDirectory: string): Promise<void> {
    try {
      await this.run("bun", ["install", "--frozen-lockfile"], projectDirectory);
    } catch (error) {
      throw new PackageInstallError((error as Error).message);
    }
    let listOutput = "";
    try {
      listOutput = await this.run("bun", ["list", "--json"], projectDirectory);
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
      await this.run("bun", ["install"], projectDirectory);
    } catch (error) {
      throw new PackageInstallError((error as Error).message);
    }
  }
}

export { BunPackageManagerAdapter };
