import { StubObservabilityClient } from "./stub-observability-client.js";

describe(StubObservabilityClient, () => {
  it("does not throw when track is called", () => {
    const client = new StubObservabilityClient();

    expect(() => client.track("some-event", { foo: "bar" })).not.toThrow();
  });

  it("does not throw when error is called", () => {
    const client = new StubObservabilityClient();

    expect(() => client.error(new Error("test error"), { context: "test" })).not.toThrow();
  });
});
