import { access, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PackageInstallError } from "../../../errors/cli-errors.js";
import type { PackageSpecifier } from "./package-specifier.port.js";

interface FilesystemApi {
  deleteFile(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

interface Runner {
  installLockfileOnly(cwd: string): Promise<void>;
  list(cwd: string): Promise<string>;
}

interface Config {
  lockfileName: string;
  deleteBeforeFirstInstall: boolean;
  runner: Runner;
  extractVersions(output: string): Record<string, string>;
  pinVersions(pkg: PackageJson, versions: Record<string, string>): PackageJson;
}

const filesystemApi: FilesystemApi = {
  deleteFile: (path) => unlink(path),
  exists: (path) =>
    access(path)
      // oxlint-disable-next-line promise/prefer-await-to-then
      .then(() => true)
      // oxlint-disable-next-line promise/prefer-await-to-then
      .catch(() => false),
  readFile: (path) => readFile(path, "utf8"),
  writeFile: (path, content) => writeFile(path, content, "utf8"),
};

const createPackageSpecifier = (config: Config): PackageSpecifier => ({
  async specifyDeps(projectDirectory: string): Promise<void> {
    const { lockfileName, runner, deleteBeforeFirstInstall } = config;
    const lockfilePath = join(projectDirectory, lockfileName);

    if (deleteBeforeFirstInstall) {
      try {
        await filesystemApi.deleteFile(lockfilePath);
      } catch {
        // Ignore — lockfile may not exist yet
      }
    }

    try {
      await runner.installLockfileOnly(projectDirectory);
    } catch (error) {
      throw new PackageInstallError((error as Error).message);
    }

    if (!(await filesystemApi.exists(lockfilePath))) {
      throw new PackageInstallError("install did not create a lockfile.");
    }

    let listOutput: string;
    try {
      listOutput = await runner.list(projectDirectory);
    } catch (error) {
      throw new PackageInstallError((error as Error).message);
    }

    const packageJsonPath = join(projectDirectory, "package.json");
    const packageJsonContent = await filesystemApi.readFile(packageJsonPath);
    const pkg = JSON.parse(packageJsonContent) as PackageJson;
    const versions = config.extractVersions(listOutput);
    const pinned = config.pinVersions(pkg, versions);

    await filesystemApi.writeFile(packageJsonPath, JSON.stringify(pinned));
    await filesystemApi.deleteFile(lockfilePath);

    try {
      await runner.installLockfileOnly(projectDirectory);
    } catch (error) {
      throw new PackageInstallError((error as Error).message);
    }

    if (!(await filesystemApi.exists(lockfilePath))) {
      throw new PackageInstallError(`install did not create a pinned lockfile.`);
    }
  },
});

export { createPackageSpecifier };
export type { PackageJson, Runner };
