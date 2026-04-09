import { StubDeployClient } from "./adapters/stub-deploy-client.js";
import { StubObservabilityClient } from "./adapters/stub-observability-client.js";
import { StubPromoteClient } from "./adapters/stub-promote-client.js";
import { StubRegistrationClient } from "./adapters/stub-registration-client.js";
import {
  deployClient,
  observabilityClient,
  promoteClient,
  registrationClient,
} from "./container.js";

describe("spike container guard", () => {
  it("wires StubDeployClient as the deploy adapter", () => {
    expect(deployClient).toBeInstanceOf(StubDeployClient);
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
});
