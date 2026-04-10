import type { PlatformManifest } from "../services/platform-manifest-service.js";

// Throws ListError on failure.
interface ListClient {
  getList(request: ListRequest): Promise<ListResponse>;
}

interface DeploymentEntry {
  deployedAt: string;
  deploymentId: string;
  state: string;
}

interface ListRequest {
  environment: string;
  manifest: PlatformManifest;
}

interface ListResponse {
  deployments: DeploymentEntry[];
  environment: string;
  name: string;
}

export type { DeploymentEntry, ListClient, ListRequest, ListResponse };
