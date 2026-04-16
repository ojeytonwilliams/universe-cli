import { StubDeployClient } from "../platform/deploy-client.stub.js";
import { StubListClient } from "../platform/list-client.stub.js";
import { StubLogsClient } from "../platform/logs-client.stub.js";
import { StubObservabilityClient } from "../observability/observability-client.stub.js";
import { StubPromoteClient } from "../platform/promote-client.stub.js";
import { StubRepoInitialiser } from "../io/repo-initialiser.stub.js";
import { StubRegistrationClient } from "../platform/registration-client.stub.js";
import { StubRollbackClient } from "../platform/rollback-client.stub.js";
import { StubStatusClient } from "../platform/status-client.stub.js";
import { StubTeardownClient } from "../platform/teardown-client.stub.js";

/**
 * Returns a fresh set of stub adapter instances for use in tests.
 */
export const createAdapterStubs = () => ({
  deployClient: new StubDeployClient(),
  listClient: new StubListClient(),
  logsClient: new StubLogsClient(),
  observability: new StubObservabilityClient(),
  promoteClient: new StubPromoteClient(),
  registrationClient: new StubRegistrationClient(),
  repoInitialiser: new StubRepoInitialiser(),
  rollbackClient: new StubRollbackClient(),
  statusClient: new StubStatusClient(),
  teardownClient: new StubTeardownClient(),
});
