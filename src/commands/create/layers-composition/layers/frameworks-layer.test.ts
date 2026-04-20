import { frameworksLayer } from "./frameworks-layer.js";

describe("frameworks/express layer", () => {
  const layer = frameworksLayer["frameworks/express"]!;

  it("provides baseImage node:22-alpine", () => {
    expect(layer.dockerfileData?.baseImage).toBe("node:22-alpine");
  });

  it("provides devCopySource that copies src/ and tsconfig.json", () => {
    expect(layer.dockerfileData?.devCopySource).toContain("COPY src/");
    expect(layer.dockerfileData?.devCopySource).toContain("COPY tsconfig.json");
  });
});

describe("frameworks/typescript layer", () => {
  const layer = frameworksLayer["frameworks/typescript"]!;

  it("provides baseImage node:22-alpine", () => {
    expect(layer.dockerfileData?.baseImage).toBe("node:22-alpine");
  });

  it("provides devCopySource that copies src/ and tsconfig.json", () => {
    expect(layer.dockerfileData?.devCopySource).toContain("COPY src/");
    expect(layer.dockerfileData?.devCopySource).toContain("COPY tsconfig.json");
  });
});

describe("frameworks/none layer", () => {
  it("has no dockerfileData", () => {
    expect(frameworksLayer["frameworks/none"]!.dockerfileData).toBeUndefined();
  });
});
