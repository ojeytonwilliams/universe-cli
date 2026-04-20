import { frameworksLayer, typedFrameworkLayers } from "./frameworks-layer.js";

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

describe("frameworks/html-css-js layer", () => {
  const layer = typedFrameworkLayers["frameworks/html-css-js"]!;

  it("has port 3000", () => {
    expect(layer.port).toBe(3000);
  });

  it("has devCopySource COPY public public", () => {
    expect(layer.devCopySource).toBe("COPY public public");
  });

  it("has watchSync for ./public → /app/public", () => {
    expect(layer.watchSync).toStrictEqual([{ path: "./public", target: "/app/public" }]);
  });

  it("has public/index.html in files", () => {
    expect(layer.files["public/index.html"]).toBeDefined();
  });

  it("has public/main.js in files", () => {
    expect(layer.files["public/main.js"]).toBeDefined();
  });

  it("has public/styles.css in files", () => {
    expect(layer.files["public/styles.css"]).toBeDefined();
  });

  it("has package.json with serve in devDependencies", () => {
    const pkg = JSON.parse(layer.files["package.json"]!) as {
      devDependencies: Record<string, string>;
    };

    expect(pkg.devDependencies["serve"]).toBeDefined();
  });

  it("has package.json with dev script using serve public -l {{port}}", () => {
    const pkg = JSON.parse(layer.files["package.json"]!) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["dev"]).toBe("serve public -l {{port}}");
  });
});
