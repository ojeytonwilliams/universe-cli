import { DeploymentError } from "../errors/cli-errors.js";
import type { DeployClient, DeployReceipt, DeployRequest } from "../ports/deploy-client.js";

const SENTINEL_FAILURE_NAME = "deploy-failure";

class StubDeployClient implements DeployClient {
  private readonly deployCounts = new Map<string, number>();

  deploy(request: DeployRequest): Promise<DeployReceipt> {
    const { environment, manifest } = request;

    if (manifest.name === SENTINEL_FAILURE_NAME) {
      return Promise.reject(
        new DeploymentError(manifest.name, "deployment failed (sentinel fixture)"),
      );
    }

    const key = `${manifest.name}-${environment}`;
    const count = (this.deployCounts.get(key) ?? 0) + 1;
    this.deployCounts.set(key, count);

    return Promise.resolve({
      deploymentId: `stub-${manifest.name}-${environment}-${count}`,
      environment,
      name: manifest.name,
    });
  }
}

export { StubDeployClient };
