import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PackageInstallError } from "../../../errors/cli-errors.js";
import { createPackageSpecifier } from "./package-json-specifier.js";
import type { PackageJson } from "./package-json-specifier.js";
import type { PackageSpecifier } from "./package-specifier.port.js";

const execFileAsync = promisify(execFile);

interface BunRunner {
  installLockfileOnly(cwd: string): Promise<void>;
  list(cwd: string): Promise<string>;
}

const defaultBunRunner: BunRunner = {
  async installLockfileOnly(cwd) {
    await execFileAsync("bun", ["install", "--lockfile-only"], { cwd, encoding: "utf8" });
  },
  async list(cwd) {
    const { stdout } = await execFileAsync("bun", ["list"], { cwd, encoding: "utf8" });
    return stdout;
  },
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

class BunPackageManager implements PackageSpecifier {
  private readonly impl: PackageSpecifier;

  constructor(runner: BunRunner = defaultBunRunner) {
    this.impl = createPackageSpecifier({
      deleteBeforeFirstInstall: true,
      extractVersions,
      lockfileName: "bun.lock",
      pinVersions,
      runner,
    });
  }

  specifyDeps(projectDirectory: string): Promise<void> {
    return this.impl.specifyDeps(projectDirectory);
  }
}

export { BunPackageManager };
