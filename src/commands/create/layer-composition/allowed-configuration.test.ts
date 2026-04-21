import {
  databaseOptions,
  frameworkOptions,
  packageManagerOptions,
  runtimeOptions,
  serviceOptions,
} from "./allowed-configuration.js";

const RUNTIMES = runtimeOptions().map((runtime) => [runtime]);

describe("allowed-configuration", () => {
  describe(runtimeOptions, () => {
    it("should return an array with all supported runtimes", () => {
      expect(runtimeOptions()).toStrictEqual(expect.arrayContaining(["node", "static_web"]));
    });
  });

  describe(frameworkOptions, () => {
    it.each(RUNTIMES)("should return non-empty arrays with for runtime '%s'", (runtime) => {
      expect(frameworkOptions(runtime).length).toBeGreaterThan(0);
    });
  });

  describe(packageManagerOptions, () => {
    it.each(RUNTIMES)("should return non-empty arrays with for runtime '%s'", (runtime) => {
      expect(packageManagerOptions(runtime).length).toBeGreaterThan(0);
    });
  });

  describe(databaseOptions, () => {
    it.each(RUNTIMES)("should return non-empty arrays with for runtime '%s'", (runtime) => {
      expect(databaseOptions(runtime).length).toBeGreaterThan(0);
    });
  });

  describe(serviceOptions, () => {
    it.each(RUNTIMES)("should return non-empty arrays with for runtime '%s'", (runtime) => {
      expect(serviceOptions(runtime).length).toBeGreaterThan(0);
    });
  });
});
