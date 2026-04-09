import { StubObservabilityClient } from "./adapters/stub-observability-client.js";
import { StubRegistrationClient } from "./adapters/stub-registration-client.js";
import { observabilityClient, registrationClient } from "./container.js";

describe("spike container guard", () => {
  it("wires StubObservabilityClient as the observability adapter", () => {
    expect(observabilityClient).toBeInstanceOf(StubObservabilityClient);
  });

  it("wires StubRegistrationClient as the registration adapter", () => {
    expect(registrationClient).toBeInstanceOf(StubRegistrationClient);
  });
});
