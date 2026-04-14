import type { PackageManager } from "../ports/package-manager.js";

class StubPackageManagerAdapter implements PackageManager {
  async specifyDeps(_projectDirectory: string): Promise<void> {
    // No-op
  }

  async install(_projectDirectory: string): Promise<void> {
    // No-op
  }
}

export { StubPackageManagerAdapter };
