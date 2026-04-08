import { StubObservabilityClient } from "./adapters/stub-observability-client.js";

// Spike-mode adapter wiring. All adapters exported from this module must be
// Spike stubs. The container guard test (container.test.ts) enforces this.
const observabilityClient = new StubObservabilityClient();

export { observabilityClient };
