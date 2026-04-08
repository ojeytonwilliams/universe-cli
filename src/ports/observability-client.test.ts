import type { ObservabilityClient } from "./observability-client.js";
import { safeError, safeTrack } from "./observability-client.js";

const throwingClient: ObservabilityClient = {
  error() {
    throw new Error("o11y backend unavailable");
  },
  track() {
    throw new Error("o11y backend unavailable");
  },
};

describe(safeTrack, () => {
  it("swallows errors thrown by the client", () => {
    expect(() => safeTrack(throwingClient, "test-event")).not.toThrow();
  });

  it("swallows errors when properties are provided", () => {
    expect(() => safeTrack(throwingClient, "test-event", { key: "value" })).not.toThrow();
  });
});

describe(safeError, () => {
  it("swallows errors thrown by the client", () => {
    expect(() => safeError(throwingClient, new Error("original error"))).not.toThrow();
  });

  it("swallows errors when context is provided", () => {
    expect(() =>
      safeError(throwingClient, new Error("original error"), {
        command: "create",
      }),
    ).not.toThrow();
  });
});
