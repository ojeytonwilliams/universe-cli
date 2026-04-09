import type { PlatformManifest } from "../services/platform-manifest-service.js";

// Throws RollbackError on failure.
interface RollbackClient {
  rollback(request: RollbackRequest): Promise<RollbackReceipt>;
}

interface RollbackReceipt {
  name: string;
  rollbackId: string;
  targetEnvironment: string;
}

interface RollbackRequest {
  manifest: PlatformManifest;
  targetEnvironment: string;
}

export type { RollbackClient, RollbackReceipt, RollbackRequest };
