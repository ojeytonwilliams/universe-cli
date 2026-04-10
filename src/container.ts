import { StubDeployClient } from "./adapters/stub-deploy-client.js";
import { StubListClient } from "./adapters/stub-list-client.js";
import { StubLogsClient } from "./adapters/stub-logs-client.js";
import { StubObservabilityClient } from "./adapters/stub-observability-client.js";
import { StubPromoteClient } from "./adapters/stub-promote-client.js";
import { StubRegistrationClient } from "./adapters/stub-registration-client.js";
import { StubRollbackClient } from "./adapters/stub-rollback-client.js";
import { StubStatusClient } from "./adapters/stub-status-client.js";
import { StubTeardownClient } from "./adapters/stub-teardown-client.js";

// Spike-mode adapter wiring. All adapters exported from this module must be
// Spike stubs. The container guard test (container.test.ts) enforces this.
const deployClient = new StubDeployClient();
const listClient = new StubListClient();
const logsClient = new StubLogsClient();
const observabilityClient = new StubObservabilityClient();
const promoteClient = new StubPromoteClient();
const registrationClient = new StubRegistrationClient();
const rollbackClient = new StubRollbackClient();
const statusClient = new StubStatusClient();
const teardownClient = new StubTeardownClient();

export {
  deployClient,
  listClient,
  logsClient,
  observabilityClient,
  promoteClient,
  registrationClient,
  rollbackClient,
  statusClient,
  teardownClient,
};
