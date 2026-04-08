import type { ObservabilityClient } from "../ports/observability-client.js";

class StubObservabilityClient implements ObservabilityClient {
  track(_event: string, _properties?: Record<string, unknown>): void {
    // No-op stub
  }

  error(_error: Error, _context?: Record<string, unknown>): void {
    // No-op stub
  }
}

export { StubObservabilityClient };
