interface PackageManager {
  specifyDeps(projectDirectory: string): Promise<void>;
}

export type { PackageManager };
