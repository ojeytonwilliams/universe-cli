import {
  InvalidMultiSelectError,
  InvalidNameError,
  TargetDirectoryExistsError,
  UnsupportedCombinationError,
  UnsupportedFrameworkError,
  UnsupportedRuntimeError,
} from "../errors/cli-errors.js";
import type { CreateSelections } from "../ports/prompt-port.js";
import { DefaultCreateInputValidator } from "./default-create-input-validator.js";

const validNodeSelection: CreateSelections = {
  confirmed: true,
  databases: ["PostgreSQL"],
  framework: "Express",
  name: "hello-universe",
  platformServices: ["Auth"],
  runtime: "Node.js (TypeScript)",
};

describe(DefaultCreateInputValidator, () => {
  it("accepts supported Node.js combinations", () => {
    const validator = new DefaultCreateInputValidator(() => false);

    const result = validator.validateCreateInput(validNodeSelection);

    expect(result).toStrictEqual(validNodeSelection);
  });

  it("accepts supported Static combination", () => {
    const validator = new DefaultCreateInputValidator(() => false);

    const result = validator.validateCreateInput({
      confirmed: true,
      databases: ["None"],
      framework: "None",
      name: "site-app",
      platformServices: ["None"],
      runtime: "Static (HTML/CSS/JS)",
    });

    expect(result.runtime).toBe("Static (HTML/CSS/JS)");
  });

  it("rejects invalid project names with typed errors", () => {
    const validator = new DefaultCreateInputValidator(() => false);

    const act = () =>
      validator.validateCreateInput({
        ...validNodeSelection,
        name: "InvalidName",
      });

    expect(act).toThrow(InvalidNameError);
  });

  it("rejects existing target directory with typed errors", () => {
    const validator = new DefaultCreateInputValidator(() => true);

    const act = () => validator.validateCreateInput(validNodeSelection);

    expect(act).toThrow(TargetDirectoryExistsError);
  });

  it('rejects multi-select values when "None" is combined with others', () => {
    const validator = new DefaultCreateInputValidator(() => false);

    const act = () =>
      validator.validateCreateInput({
        ...validNodeSelection,
        databases: ["None", "Redis"],
      });

    expect(act).toThrow(InvalidMultiSelectError);
  });

  it("rejects unsupported runtimes", () => {
    const validator = new DefaultCreateInputValidator(() => false);

    const act = () =>
      validator.validateCreateInput({
        ...validNodeSelection,
        runtime: "Python" as CreateSelections["runtime"],
      });

    expect(act).toThrow(UnsupportedRuntimeError);
  });

  it("rejects unsupported frameworks per runtime", () => {
    const validator = new DefaultCreateInputValidator(() => false);

    const act = () =>
      validator.validateCreateInput({
        ...validNodeSelection,
        framework: "Flask" as CreateSelections["framework"],
      });

    expect(act).toThrow(UnsupportedFrameworkError);
  });

  it("rejects unsupported Static database combinations", () => {
    const validator = new DefaultCreateInputValidator(() => false);

    const act = () =>
      validator.validateCreateInput({
        confirmed: true,
        databases: ["PostgreSQL"],
        framework: "None",
        name: "site-app",
        platformServices: ["None"],
        runtime: "Static (HTML/CSS/JS)",
      });

    expect(act).toThrow(UnsupportedCombinationError);
  });

  it("rejects unsupported Static platform service combinations", () => {
    const validator = new DefaultCreateInputValidator(() => false);

    const act = () =>
      validator.validateCreateInput({
        confirmed: true,
        databases: ["None"],
        framework: "None",
        name: "site-app",
        platformServices: ["Auth"],
        runtime: "Static (HTML/CSS/JS)",
      });

    expect(act).toThrow(UnsupportedCombinationError);
  });
});
