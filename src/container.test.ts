import { StubDeployClient } from "./adapters/stub-deploy-client.js";
import { StubLogsClient } from "./adapters/stub-logs-client.js";
import { StubObservabilityClient } from "./adapters/stub-observability-client.js";
import { StubPromoteClient } from "./adapters/stub-promote-client.js";
import { StubRegistrationClient } from "./adapters/stub-registration-client.js";
import { StubRollbackClient } from "./adapters/stub-rollback-client.js";
import { StubStatusClient } from "./adapters/stub-status-client.js";
import {
  deployClient,
  logsClient,
  observabilityClient,
  promoteClient,
  registrationClient,
  rollbackClient,
  statusClient,
} from "./container.js";

describe("spike container guard", () => {
  it("wires StubDeployClient as the deploy adapter", () => {
    expect(deployClient).toBeInstanceOf(StubDeployClient);
  });

  it("wires StubLogsClient as the logs adapter", () => {
    expect(logsClient).toBeInstanceOf(StubLogsClient);
  });

  it("wires StubObservabilityClient as the observability adapter", () => {
    expect(observabilityClient).toBeInstanceOf(StubObservabilityClient);
  });

  it("wires StubPromoteClient as the promote adapter", () => {
    expect(promoteClient).toBeInstanceOf(StubPromoteClient);
  });

  it("wires StubRegistrationClient as the registration adapter", () => {
    expect(registrationClient).toBeInstanceOf(StubRegistrationClient);
  });

  it("wires StubRollbackClient as the rollback adapter", () => {
    expect(rollbackClient).toBeInstanceOf(StubRollbackClient);
  });

  it("wires StubStatusClient as the status adapter", () => {
    expect(statusClient).toBeInstanceOf(StubStatusClient);
  });
});
