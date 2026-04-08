import { StubObservabilityClient } from "./adapters/stub-observability-client.js";
import { observabilityClient } from "./container.js";

describe("spike container guard", () => {
  it("wires StubObservabilityClient as the observability adapter", () => {
    expect(observabilityClient).toBeInstanceOf(StubObservabilityClient);
  });
});
