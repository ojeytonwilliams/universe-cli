import {
  InvalidMultiSelectError,
  InvalidNameError,
  TargetDirectoryExistsError,
  UnsupportedCombinationError,
  UnsupportedFrameworkError,
  UnsupportedRuntimeError,
} from "../errors/cli-errors.js";
import type { CreateSelections } from "../ports/prompt-port.js";
import { CreateInputValidationService } from "./create-input-validation-service.js";

const validNodeSelection: CreateSelections = {
  confirmed: true,
  databases: ["postgresql"],
  framework: "express",
  name: "hello-universe",
  platformServices: ["auth"],
  runtime: "node_ts",
};

describe(CreateInputValidationService, () => {
  it("accepts supported Node.js combinations", () => {
    const service = new CreateInputValidationService(() => false);

    const result = service.validateCreateInput(validNodeSelection);

    expect(result).toStrictEqual(validNodeSelection);
  });

  it("accepts supported Static combination", () => {
    const service = new CreateInputValidationService(() => false);

    const result = service.validateCreateInput({
      confirmed: true,
      databases: ["none"],
      framework: "none",
      name: "site-app",
      platformServices: ["none"],
      runtime: "static_web",
    });

    expect(result.runtime).toBe("static_web");
  });

  it("rejects invalid project names with typed errors", () => {
    const service = new CreateInputValidationService(() => false);

    const act = () =>
      service.validateCreateInput({
        ...validNodeSelection,
        name: "InvalidName",
      });

    expect(act).toThrow(InvalidNameError);
  });

  it("rejects existing target directory with typed errors", () => {
    const service = new CreateInputValidationService(() => true);

    const act = () => service.validateCreateInput(validNodeSelection);

    expect(act).toThrow(TargetDirectoryExistsError);
  });

  it('rejects multi-select values when "None" is combined with others', () => {
    const service = new CreateInputValidationService(() => false);

    const act = () =>
      service.validateCreateInput({
        ...validNodeSelection,
        databases: ["none", "redis"],
      });

    expect(act).toThrow(InvalidMultiSelectError);
  });

  it("rejects unsupported runtimes", () => {
    const service = new CreateInputValidationService(() => false);

    const act = () =>
      service.validateCreateInput({
        ...validNodeSelection,
        runtime: "Python" as CreateSelections["runtime"],
      });

    expect(act).toThrow(UnsupportedRuntimeError);
  });

  it("rejects unsupported frameworks per runtime", () => {
    const service = new CreateInputValidationService(() => false);

    const act = () =>
      service.validateCreateInput({
        ...validNodeSelection,
        framework: "Flask" as CreateSelections["framework"],
      });

    expect(act).toThrow(UnsupportedFrameworkError);
  });

  it("rejects unsupported Static database combinations", () => {
    const service = new CreateInputValidationService(() => false);

    const act = () =>
      service.validateCreateInput({
        confirmed: true,
        databases: ["postgresql"],
        framework: "none",
        name: "site-app",
        platformServices: ["none"],
        runtime: "static_web",
      });

    expect(act).toThrow(UnsupportedCombinationError);
  });

  it("rejects unsupported Static platform service combinations", () => {
    const service = new CreateInputValidationService(() => false);

    const act = () =>
      service.validateCreateInput({
        confirmed: true,
        databases: ["none"],
        framework: "none",
        name: "site-app",
        platformServices: ["auth"],
        runtime: "static_web",
      });

    expect(act).toThrow(UnsupportedCombinationError);
  });
});
