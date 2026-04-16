import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { PackageInstallError } from "../errors/cli-errors.js";
import type { PackageManager } from "../ports/package-manager.js";

const execFileAsync = promisify(execFile);

interface BunRunner {
  installLockfileOnly(cwd: string): Promise<void>;
  install(cwd: string): Promise<void>;
  list(cwd: string): Promise<string>;
}

interface FilesystemApi {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
}

const defaultBunRunner: BunRunner = {
  async install(cwd) {
    await execFileAsync("bun", ["install"], { cwd, encoding: "utf8" });
  },
  async installLockfileOnly(cwd) {
    await execFileAsync("bun", ["install", "--lockfile-only"], { cwd, encoding: "utf8" });
  },
  async list(cwd) {
    const { stdout } = await execFileAsync("bun", ["list"], { cwd, encoding: "utf8" });
    return stdout;
  },
};

const defaultFilesystemApi: FilesystemApi = {
  readFile: (path) => readFile(path, "utf8"),
  writeFile: (path, content) => writeFile(path, content, "utf8"),
};

// Parses the tree output from `bun list` (not JSON)
const extractVersions = (listOutput: string): Record<string, string> => {
  const versions: Record<string, string> = {};
  // Match lines like: ├── the-answer@1.0.0 or └── typescript@5.9.3
  const regex = /^[├└]──\s+([^@\s]+)@([\w.-]+)/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(listOutput)) !== null) {
    const [, name, version] = match;
    if (
      typeof name === "string" &&
      typeof version === "string" &&
      name.length > 0 &&
      version.length > 0
    ) {
      versions[name] = version;
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
      Object.entries(deps).map(([name, range]) => {
        const pinnedVersion = versions[name];
        if (pinnedVersion === "" || pinnedVersion === undefined) {
          throw new PackageInstallError(
            `Dependency mismatch - no pinned version found for package "${name}"`,
          );
        }
        return [name, versions[name] ?? range];
      }),
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
  private readonly bun;
  private readonly filesystem;

  constructor(bun: BunRunner = defaultBunRunner, filesystem: FilesystemApi = defaultFilesystemApi) {
    this.bun = bun;
    this.filesystem = filesystem;
  }

  async specifyDeps(projectDirectory: string): Promise<void> {
    let listOutput: string;
    try {
      await this.bun.installLockfileOnly(projectDirectory);
      listOutput = await this.bun.list(projectDirectory);
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
      await this.bun.install(projectDirectory);
    } catch (error) {
      throw new PackageInstallError((error as Error).message);
    }
  }
}

export { BunPackageManagerAdapter };
