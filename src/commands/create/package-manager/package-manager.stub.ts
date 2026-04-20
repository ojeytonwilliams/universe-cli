import type { PackageManager } from "./package-manager.port.js";

class StubPackageManager implements PackageManager {
  async specifyDeps(_projectDirectory: string): Promise<void> {
    // No-op
  }

  async install(_projectDirectory: string): Promise<void> {
    // No-op
  }
}

export { StubPackageManager };
