import { createPackageSpecifier } from "./package-json-specifier.js";
import type { PackageSpecifier } from "./package-specifier.port.js";
import { runCmd } from "./docker-runner.js";

interface BunRunner {
  installLockfileOnly(cwd: string): Promise<void>;
  list(cwd: string): Promise<string>;
}

const bunRunner: BunRunner = {
  async installLockfileOnly(cwd) {
    await runCmd(cwd, ["bun", "install", "--lockfile-only"]);
  },
  async list(cwd) {
    const output = await runCmd(cwd, ["bun", "list"]);
    return output;
  },
};

// Parses the tree output from `bun list` (not JSON)
const extractVersions = (listOutput: string): Record<string, string> => {
  const versions: Record<string, string> = {};
  // Match lines like: ├── the-answer@1.0.0, └── typescript@5.9.3 or ├── @types/node@18.16.18
  const regex = /^[├└]──\s+(@?[^@\s]+)@([\w.-]+)/gm;
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

class BunPackageManager implements PackageSpecifier {
  private readonly impl: PackageSpecifier;

  constructor(runner: BunRunner = bunRunner) {
    this.impl = createPackageSpecifier({
      deleteBeforeFirstInstall: true,
      extractVersions,
      lockfileName: "bun.lock",
      runner,
    });
  }

  specifyDeps(projectDirectory: string): Promise<void> {
    return this.impl.specifyDeps(projectDirectory);
  }
}

export { BunPackageManager, extractVersions };
