import { StubDeployClient } from "../adapters/stub-deploy-client.js";
import { StubListClient } from "../adapters/stub-list-client.js";
import { StubLogsClient } from "../adapters/stub-logs-client.js";
import { StubObservabilityClient } from "../adapters/stub-observability-client.js";
import { StubPackageManagerAdapter } from "../adapters/stub-package-manager-adapter.js";
import { StubPromoteClient } from "../adapters/stub-promote-client.js";
import { StubRepoInitialiserAdapter } from "../adapters/stub-repo-initialiser-adapter.js";
import { StubRegistrationClient } from "../adapters/stub-registration-client.js";
import { StubRollbackClient } from "../adapters/stub-rollback-client.js";
import { StubStatusClient } from "../adapters/stub-status-client.js";
import { StubTeardownClient } from "../adapters/stub-teardown-client.js";
// Stub for BunPackageManagerAdapter (no-op for tests)

/**
 * Returns a fresh set of stub adapter instances for use in tests.
 */
export const createAdapterStubs = () => ({
  deployClient: new StubDeployClient(),
  listClient: new StubListClient(),
  logsClient: new StubLogsClient(),
  observability: new StubObservabilityClient(),
  packageManager: new StubPackageManagerAdapter(),
  promoteClient: new StubPromoteClient(),
  registrationClient: new StubRegistrationClient(),
  repoInitialiser: new StubRepoInitialiserAdapter(),
  rollbackClient: new StubRollbackClient(),
  statusClient: new StubStatusClient(),
  teardownClient: new StubTeardownClient(),
});
