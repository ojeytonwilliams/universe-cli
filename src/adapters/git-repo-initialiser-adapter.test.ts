import { RepoInitialisationError } from "../errors/cli-errors.js";
import { GitRepoInitialiserAdapter } from "./git-repo-initialiser-adapter.js";

describe(GitRepoInitialiserAdapter, () => {
  it("runs git init, git add ., and git commit in order", async () => {
    const calls: [string, string[]][] = [];
    const run = vi.fn((command: string, args: string[]) => {
      calls.push([command, args]);
      return Promise.resolve();
    });
    const adapter = new GitRepoInitialiserAdapter(run);

    await adapter.initialise("/some/project");

    expect(calls).toStrictEqual([
      ["git", ["init"]],
      ["git", ["add", "."]],
      ["git", ["commit", "-m", "chore: initial commit"]],
    ]);
  });

  it("throws RepoInitialisationError when any git command exits non-zero", async () => {
    const run = vi.fn(() => Promise.reject(new Error("git exited with code 128")));
    const adapter = new GitRepoInitialiserAdapter(run);

    await expect(adapter.initialise("/some/project")).rejects.toBeInstanceOf(
      RepoInitialisationError,
    );
  });
});
