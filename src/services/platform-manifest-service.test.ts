import type { CreateSelections } from "../ports/prompt-port.js";
import { PlatformManifestService } from "./platform-manifest-service.js";

const nodeSelection: CreateSelections = {
  confirmed: true,
  databases: ["Redis", "PostgreSQL"],
  framework: "Express",
  name: "hello-universe",
  platformServices: ["Email", "Auth"],
  runtime: "Node.js (TypeScript)",
};

describe(PlatformManifestService, () => {
  it("generates the required app stack fields in stable service order", () => {
    const service = new PlatformManifestService();

    const result = service.generatePlatformManifest(nodeSelection);

    expect(result).toMatchSnapshot();
  });

  it("emits explicit empty collections when no Node.js services are selected", () => {
    const service = new PlatformManifestService();

    const result = service.generatePlatformManifest({
      ...nodeSelection,
      databases: ["None"],
      framework: "None",
      platformServices: ["None"],
    });

    expect(result).toContain("services: []");
    expect(result).toContain("resources: []");
  });

  it("generates the static stack shape without app-only fields", () => {
    const service = new PlatformManifestService();

    const result = service.generatePlatformManifest({
      confirmed: true,
      databases: ["None"],
      framework: "None",
      name: "marketing-site",
      platformServices: ["None"],
      runtime: "Static (HTML/CSS/JS)",
    });

    expect(result).toMatchSnapshot();
  });
});
