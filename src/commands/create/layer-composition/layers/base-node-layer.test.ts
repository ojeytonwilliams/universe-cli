import { baseNodeLayer } from "./base-node-layer.js";

describe("base-node-layer RuntimeLayerData", () => {
  it("has baseImage node:22-alpine", () => {
    expect(baseNodeLayer.baseImage).toBe("node:22-alpine");
  });

  it("does not include docker-compose.dev.yml in files", () => {
    expect(baseNodeLayer.files["docker-compose.dev.yml"]).toBeUndefined();
  });
});
