import { TeardownError } from "../errors/cli-errors.js";
import type { TeardownClient, TeardownReceipt, TeardownRequest } from "../ports/teardown-client.js";

const SENTINEL_FAILURE_NAME = "teardown-failure";

class StubTeardownClient implements TeardownClient {
  private readonly teardownCounts = new Map<string, number>();

  teardown(request: TeardownRequest): Promise<TeardownReceipt> {
    const { manifest, targetEnvironment } = request;

    if (manifest.name === SENTINEL_FAILURE_NAME) {
      return Promise.reject(new TeardownError(manifest.name, "teardown failed (sentinel fixture)"));
    }

    const key = `${manifest.name}-${targetEnvironment}`;
    const count = (this.teardownCounts.get(key) ?? 0) + 1;
    this.teardownCounts.set(key, count);

    return Promise.resolve({
      name: manifest.name,
      targetEnvironment,
      teardownId: `stub-teardown-${manifest.name}-${targetEnvironment}-${count}`,
    });
  }
}

export { StubTeardownClient };
