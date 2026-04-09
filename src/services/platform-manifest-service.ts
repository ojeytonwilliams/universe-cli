import type { CreateSelections } from "../ports/prompt-port.js";

class PlatformManifestService {
  generatePlatformManifest(input: CreateSelections): string {
    if (input.runtime === "Static (HTML/CSS/JS)") {
      return [
        `name: ${input.name}`,
        "stack: static",
        "domain:",
        `  production: ${input.name}.example.com`,
        `  preview: ${input.name}.preview.example.com`,
        "environments:",
        "  preview:",
        "    branch: preview",
        "  production:",
        "    branch: main",
        "",
      ].join("\n");
    }

    const services = input.platformServices.filter((value) => value !== "None").sort();
    const resources = input.databases.filter((value) => value !== "None").sort();
    const serviceLines =
      services.length === 0
        ? ["services: []"]
        : ["services:", ...services.map((service) => `  - ${service.toLowerCase()}`)];
    const resourceLines =
      resources.length === 0
        ? ["resources: []"]
        : ["resources:", ...resources.map((resource) => `  - ${resource.toLowerCase()}`)];

    return [
      `name: ${input.name}`,
      "owner: platform-engineering",
      "domain:",
      `  production: ${input.name}.example.com`,
      `  preview: ${input.name}.preview.example.com`,
      "environments:",
      "  preview:",
      "    branch: preview",
      "  production:",
      "    branch: main",
      ...serviceLines,
      ...resourceLines,
      "",
    ].join("\n");
  }
}

export { PlatformManifestService };
