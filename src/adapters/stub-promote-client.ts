import { PromotionError } from "../errors/cli-errors.js";
import type { PromoteClient, PromoteReceipt, PromoteRequest } from "../ports/promote-client.js";

const SENTINEL_FAILURE_NAME = "promote-failure";

class StubPromoteClient implements PromoteClient {
  private readonly promoteCounts = new Map<string, number>();

  promote(request: PromoteRequest): Promise<PromoteReceipt> {
    const { manifest, targetEnvironment } = request;

    if (manifest.name === SENTINEL_FAILURE_NAME) {
      return Promise.reject(
        new PromotionError(manifest.name, "promotion failed (sentinel fixture)"),
      );
    }

    const key = `${manifest.name}-${targetEnvironment}`;
    const count = (this.promoteCounts.get(key) ?? 0) + 1;
    this.promoteCounts.set(key, count);

    return Promise.resolve({
      name: manifest.name,
      promotionId: `stub-promote-${manifest.name}-${targetEnvironment}-${count}`,
      targetEnvironment,
    });
  }
}

export { StubPromoteClient };
