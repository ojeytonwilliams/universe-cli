import { baseStaticLayer } from "./base-static-layer.js";

describe("base-static-layer RuntimeLayerData", () => {
  it("has baseImage node:22-alpine", () => {
    expect(baseStaticLayer.baseImage).toBe("node:22-alpine");
  });

  it("does not include docker-compose.dev.yml in files", () => {
    expect(baseStaticLayer.files["docker-compose.dev.yml"]).toBeUndefined();
  });

  it("does not include public/ files in files", () => {
    expect(baseStaticLayer.files["public/index.html"]).toBeUndefined();
    expect(baseStaticLayer.files["public/main.js"]).toBeUndefined();
    expect(baseStaticLayer.files["public/styles.css"]).toBeUndefined();
  });
});
