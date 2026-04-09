import { StubDeployClient } from "./adapters/stub-deploy-client.js";
import { StubObservabilityClient } from "./adapters/stub-observability-client.js";
import { StubPromoteClient } from "./adapters/stub-promote-client.js";
import { StubRegistrationClient } from "./adapters/stub-registration-client.js";

// Spike-mode adapter wiring. All adapters exported from this module must be
// Spike stubs. The container guard test (container.test.ts) enforces this.
const deployClient = new StubDeployClient();
const observabilityClient = new StubObservabilityClient();
const promoteClient = new StubPromoteClient();
const registrationClient = new StubRegistrationClient();

export { deployClient, observabilityClient, promoteClient, registrationClient };
