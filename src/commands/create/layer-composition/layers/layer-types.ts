interface WatchSyncEntry {
  path: string;
  target: string;
}

interface WatchRebuildEntry {
  path: string;
}

interface RuntimeLayerData {
  baseImage: string;
  files: Record<string, string>;
}

interface FrameworkLayerData {
  devCopySource: string;
  files: Record<string, string>;
  port: number;
  watchSync: WatchSyncEntry[];
}

interface PackageManagerLayerData {
  devCmd: string[];
  devInstall: string;
  files: Record<string, string>;
  preinstall?: string;
  watchRebuild: WatchRebuildEntry[];
}

export type {
  FrameworkLayerData,
  PackageManagerLayerData,
  RuntimeLayerData,
  WatchRebuildEntry,
  WatchSyncEntry,
};
