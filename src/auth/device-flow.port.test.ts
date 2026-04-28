import type { DeviceFlow, DeviceFlowOptions } from "./device-flow.port.js";

describe("device-flow port", () => {
  it("is implementable with a conforming object", async () => {
    const flow: DeviceFlow = {
      run: (_opts: DeviceFlowOptions) => Promise.resolve("stub-token"),
    };
    await expect(flow.run({ clientId: "x", onPrompt: () => {} })).resolves.toBe("stub-token");
  });
});
