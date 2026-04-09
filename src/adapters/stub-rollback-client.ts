import { RollbackError } from "../errors/cli-errors.js";
import type { RollbackClient, RollbackReceipt, RollbackRequest } from "../ports/rollback-client.js";

const SENTINEL_FAILURE_NAME = "rollback-failure";

class StubRollbackClient implements RollbackClient {
  private readonly rollbackCounts = new Map<string, number>();

  rollback(request: RollbackRequest): Promise<RollbackReceipt> {
    const { manifest, targetEnvironment } = request;

    if (manifest.name === SENTINEL_FAILURE_NAME) {
      return Promise.reject(new RollbackError(manifest.name, "rollback failed (sentinel fixture)"));
    }

    const key = `${manifest.name}-${targetEnvironment}`;
    const count = (this.rollbackCounts.get(key) ?? 0) + 1;
    this.rollbackCounts.set(key, count);

    return Promise.resolve({
      name: manifest.name,
      rollbackId: `stub-rollback-${manifest.name}-${targetEnvironment}-${count}`,
      targetEnvironment,
    });
  }
}

export { StubRollbackClient };
