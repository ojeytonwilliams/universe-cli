import databaseJson from "../layers/database.json" with { type: "json" };
import frameworkJson from "../layers/framework.json" with { type: "json" };
import packageManagersJson from "../layers/package-manager.json" with { type: "json" };
import runtimeJson from "../layers/runtime.json" with { type: "json" };

describe("runtime layers", () => {
  it("should have a 'framework' array referencing specific frameworks", () => {
    const runtimes = Object.values(runtimeJson);
    const runtimeFrameworks = runtimes.flatMap((runtime) => runtime.frameworks);
    const frameworkNames = Object.keys(frameworkJson);

    runtimeFrameworks.forEach((framework: string) => {
      expect(frameworkNames).toContain(framework);
    });
  });

  it("should have a 'packageManagers' array referencing specific package managers", () => {
    const runtimes = Object.values(runtimeJson);
    const runtimePackageManagers = runtimes.flatMap((runtime) => runtime.packageManagers);
    const packageManagerNames = Object.keys(packageManagersJson);

    runtimePackageManagers.forEach((packageManager: string) => {
      expect(packageManagerNames).toContain(packageManager);
    });
  });

  it("should have a 'databases' array referencing specific databases", () => {
    const runtimes = Object.values(runtimeJson);
    const runtimeDatabases = runtimes.flatMap((runtime) => runtime.databases);
    const databaseNames = databaseJson;

    runtimeDatabases.forEach((database: string) => {
      expect(databaseNames).toContain(database);
    });
  });
});

describe("framework layers", () => {
  it("each framework should have a corresponding runtime", () => {
    const frameworks = Object.keys(frameworkJson);
    const runtimes = Object.values(runtimeJson);
    const runtimeFrameworks = runtimes.flatMap((runtime) => runtime.frameworks);

    frameworks.forEach((framework) => {
      expect(runtimeFrameworks).toContain(framework);
    });
  });
});

describe("package manager layers", () => {
  it("each package manager should have a corresponding runtime", () => {
    const packageManagers = Object.keys(packageManagersJson);
    const runtimes = Object.values(runtimeJson);
    const runtimePackageManagers = runtimes.flatMap((runtime) => runtime.packageManagers);

    packageManagers.forEach((packageManager) => {
      expect(runtimePackageManagers).toContain(packageManager);
    });
  });
});

describe("database layers", () => {
  it("each database should have a corresponding runtime", () => {
    const databases = databaseJson;
    const runtimes = Object.values(runtimeJson);
    const runtimeDatabases = runtimes.flatMap((runtime) => runtime.databases);

    databases.forEach((database) => {
      expect(runtimeDatabases).toContain(database);
    });
  });
});
