import { execFile } from "node:child_process";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const IMAGE_TAG = "universe-runner:pm";

const ensureImageBuilt = async (cwd: string): Promise<void> => {
  const dockerfile = resolve(cwd, "Dockerfile");
  const context = dirname(dockerfile);

  await execFileAsync(
    "docker",
    ["build", "--file", dockerfile, "--target", "package-manager", "--tag", IMAGE_TAG, context],
    { encoding: "utf8" },
  );
};

export const runCmd = async (cwd: string, cmd: string[]): Promise<string> => {
  // Fallback for non-POSIX platforms, where getuid/getgid may not be available
  const user = `${process.getuid?.() ?? 0}:${process.getgid?.() ?? 0}`;

  await ensureImageBuilt(cwd);

  const { stdout } = await execFileAsync(
    "docker",
    ["run", "--rm", "--user", user, "-v", `${cwd}:/app`, "-w", "/app", IMAGE_TAG, ...cmd],
    { encoding: "utf8" },
  );
  return stdout;
};
