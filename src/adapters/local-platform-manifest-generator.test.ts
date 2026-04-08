import type { CreateSelections } from "../ports/prompt-port.js";
import { LocalPlatformManifestGenerator } from "./local-platform-manifest-generator.js";

const nodeSelection: CreateSelections = {
  confirmed: true,
  databases: ["Redis", "PostgreSQL"],
  framework: "Express",
  name: "hello-universe",
  platformServices: ["Email", "Auth"],
  runtime: "Node.js (TypeScript)",
};

describe(LocalPlatformManifestGenerator, () => {
  it("generates the required app stack fields in stable service order", () => {
    const generator = new LocalPlatformManifestGenerator();

    const result = generator.generatePlatformManifest(nodeSelection);

    expect(result).toMatchInlineSnapshot(`
      "name: hello-universe
      owner: platform-engineering
      domain:
        production: hello-universe.example.com
        preview: hello-universe.preview.example.com
      environments:
        preview:
          branch: preview
        production:
          branch: main
      services:
        - auth
        - email
      resources:
        - postgresql
        - redis
      "
    `);
  });

  it("emits explicit empty collections when no Node.js services are selected", () => {
    const generator = new LocalPlatformManifestGenerator();

    const result = generator.generatePlatformManifest({
      ...nodeSelection,
      databases: ["None"],
      framework: "None",
      platformServices: ["None"],
    });

    expect(result).toContain("services: []");
    expect(result).toContain("resources: []");
  });

  it("generates the static stack shape without app-only fields", () => {
    const generator = new LocalPlatformManifestGenerator();

    const result = generator.generatePlatformManifest({
      confirmed: true,
      databases: ["None"],
      framework: "None",
      name: "marketing-site",
      platformServices: ["None"],
      runtime: "Static (HTML/CSS/JS)",
    });

    expect(result).toMatchInlineSnapshot(`
      "name: marketing-site
      stack: static
      domain:
        production: marketing-site.example.com
        preview: marketing-site.preview.example.com
      environments:
        preview:
          branch: preview
        production:
          branch: main
      "
    `);
  });
});
