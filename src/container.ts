import { StubObservabilityClient } from "./adapters/stub-observability-client.js";
import { StubRegistrationClient } from "./adapters/stub-registration-client.js";

// Spike-mode adapter wiring. All adapters exported from this module must be
// Spike stubs. The container guard test (container.test.ts) enforces this.
const observabilityClient = new StubObservabilityClient();
const registrationClient = new StubRegistrationClient();

export { observabilityClient, registrationClient };
