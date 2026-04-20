import { frameworksLayer } from "./frameworks-layer.js";

describe("frameworks/express layer", () => {
  const layer = frameworksLayer["frameworks/express"];

  it("has port 3000", () => {
    expect(layer.port).toBe(3000);
  });

  it("has devCopySource that copies src/ and tsconfig.json", () => {
    expect(layer.devCopySource).toContain("COPY src/");
    expect(layer.devCopySource).toContain("COPY tsconfig.json");
  });

  it("has watchSync for ./src → /app/src", () => {
    expect(layer.watchSync).toStrictEqual([{ path: "./src", target: "/app/src" }]);
  });

  it("uses {{port}} placeholder instead of hardcoded 3000 in src/index.ts", () => {
    const content = layer.files["src/index.ts"];

    expect(content).toContain("{{port}}");
    expect(content).not.toContain("3000");
  });
});

describe("frameworks/typescript layer", () => {
  const layer = frameworksLayer["frameworks/typescript"];

  it("has port 3000", () => {
    expect(layer.port).toBe(3000);
  });

  it("has devCopySource that copies src/ and tsconfig.json", () => {
    expect(layer.devCopySource).toContain("COPY src/");
    expect(layer.devCopySource).toContain("COPY tsconfig.json");
  });

  it("has watchSync for ./src → /app/src", () => {
    expect(layer.watchSync).toStrictEqual([{ path: "./src", target: "/app/src" }]);
  });

  it("uses {{port}} placeholder instead of hardcoded 3000 in src/index.ts", () => {
    const content = layer.files["src/index.ts"];

    expect(content).toContain("{{port}}");
    expect(content).not.toContain("3000");
  });
});
