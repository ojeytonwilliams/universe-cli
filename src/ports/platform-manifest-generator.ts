import type { CreateSelections } from "./prompt-port.js";

interface PlatformManifestGenerator {
  generatePlatformManifest(input: CreateSelections): string;
}

export type { PlatformManifestGenerator };
