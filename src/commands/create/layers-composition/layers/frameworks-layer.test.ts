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

describe("frameworksLayer registry", () => {
  it("does not expose a frameworks/none entry", () => {
    expect((frameworksLayer as Record<string, unknown>)["frameworks/none"]).toBeUndefined();
  });
});

describe("frameworks/react-vite layer", () => {
  const layer = typedFrameworkLayers["frameworks/react-vite"]!;

  it("has port 5173", () => {
    expect(layer.port).toBe(5173);
  });

  it("has devCopySource that copies src, index.html, vite.config.ts and tsconfig files", () => {
    expect(layer.devCopySource).toBe(
      "COPY src src\nCOPY index.html .\nCOPY vite.config.ts .\nCOPY tsconfig*.json .",
    );
  });

  it("has watchSync for ./src → /app/src", () => {
    expect(layer.watchSync).toStrictEqual([{ path: "./src", target: "/app/src" }]);
  });

  it("has package.json with dev script that includes --host", () => {
    const pkg = JSON.parse(layer.files["package.json"]!) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["dev"]).toContain("--host");
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
