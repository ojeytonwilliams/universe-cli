import type { PlatformManifest } from "../services/platform-manifest-service.js";

// Throws DeploymentError on failure.
interface DeployClient {
  deploy(request: DeployRequest): Promise<DeployReceipt>;
}

interface DeployReceipt {
  deploymentId: string;
  environment: string;
  name: string;
}

interface DeployRequest {
  environment: string;
  manifest: PlatformManifest;
}

export type { DeployClient, DeployReceipt, DeployRequest };
