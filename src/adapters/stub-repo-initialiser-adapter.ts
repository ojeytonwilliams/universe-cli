import type { RepoInitialiser } from "../ports/repo-initialiser.js";

class StubRepoInitialiserAdapter implements RepoInitialiser {
  async initialise(_projectDirectory: string): Promise<void> {
    // No-op
  }
}

export { StubRepoInitialiserAdapter };
