import { DEPENDENCY_VERSIONS } from "./dependency-versions.js";

describe("dependency-versions", () => {
  it.each(Object.entries(DEPENDENCY_VERSIONS))(
    "specifies %s as a major-version range",
    (_name, version) => {
      expect(version).toMatch(/^\^\d+$/);
    },
  );
});
