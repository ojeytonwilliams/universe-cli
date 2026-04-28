import {
  EXIT_SUCCESS,
  EXIT_USAGE,
  EXIT_CONFIG,
  EXIT_CREDENTIALS,
  EXIT_STORAGE,
  EXIT_OUTPUT_DIR,
  EXIT_GIT,
  EXIT_ALIAS,
  EXIT_DEPLOY_NOT_FOUND,
  EXIT_CONFIRM,
  EXIT_PARTIAL,
  EXIT_UNSUPPORTED,
  EXIT_TARGET_EXISTS,
  EXIT_INVALID_MULTI_SELECT,
  EXIT_LAYER,
  EXIT_SCAFFOLD_WRITE,
  EXIT_MANIFEST,
  EXIT_REGISTRATION,
  EXIT_DEPLOYMENT,
  EXIT_PROMOTION,
  EXIT_ROLLBACK,
  EXIT_LOGS,
  EXIT_STATUS,
  EXIT_LIST,
  EXIT_TEARDOWN,
  EXIT_INVALID_NAME,
  EXIT_BAD_ARGUMENTS,
  EXIT_PACKAGE_INSTALL,
  EXIT_REPO_INITIALISATION,
} from "./exit-codes.js";

describe("other's stable published exit codes (10–19)", () => {
  it("eXIT_SUCCESS is 0", () => expect(EXIT_SUCCESS).toBe(0));

  it("eXIT_USAGE is 10", () => expect(EXIT_USAGE).toBe(10));

  it("eXIT_CONFIG is 11", () => expect(EXIT_CONFIG).toBe(11));

  it("eXIT_CREDENTIALS is 12", () => expect(EXIT_CREDENTIALS).toBe(12));

  it("eXIT_STORAGE is 13", () => expect(EXIT_STORAGE).toBe(13));

  it("eXIT_OUTPUT_DIR is 14", () => expect(EXIT_OUTPUT_DIR).toBe(14));

  it("eXIT_GIT is 15", () => expect(EXIT_GIT).toBe(15));

  it("eXIT_ALIAS is 16", () => expect(EXIT_ALIAS).toBe(16));

  it("eXIT_DEPLOY_NOT_FOUND is 17", () => expect(EXIT_DEPLOY_NOT_FOUND).toBe(17));

  it("eXIT_CONFIRM is 18", () => expect(EXIT_CONFIRM).toBe(18));

  it("eXIT_PARTIAL is 19", () => expect(EXIT_PARTIAL).toBe(19));
});

describe("main's non-colliding codes (3–9)", () => {
  it("eXIT_TARGET_EXISTS is 3", () => expect(EXIT_TARGET_EXISTS).toBe(3));

  it("eXIT_UNSUPPORTED is 4", () => expect(EXIT_UNSUPPORTED).toBe(4));

  it("eXIT_INVALID_MULTI_SELECT is 5", () => expect(EXIT_INVALID_MULTI_SELECT).toBe(5));

  it("eXIT_LAYER is 6", () => expect(EXIT_LAYER).toBe(6));

  it("eXIT_SCAFFOLD_WRITE is 7", () => expect(EXIT_SCAFFOLD_WRITE).toBe(7));

  it("eXIT_MANIFEST is 8", () => expect(EXIT_MANIFEST).toBe(8));

  it("eXIT_REGISTRATION is 9", () => expect(EXIT_REGISTRATION).toBe(9));
});

describe("main's renumbered codes (21–31)", () => {
  it("eXIT_DEPLOYMENT is 21", () => expect(EXIT_DEPLOYMENT).toBe(21));

  it("eXIT_PROMOTION is 22", () => expect(EXIT_PROMOTION).toBe(22));

  it("eXIT_ROLLBACK is 23", () => expect(EXIT_ROLLBACK).toBe(23));

  it("eXIT_LOGS is 24", () => expect(EXIT_LOGS).toBe(24));

  it("eXIT_STATUS is 25", () => expect(EXIT_STATUS).toBe(25));

  it("eXIT_LIST is 26", () => expect(EXIT_LIST).toBe(26));

  it("eXIT_TEARDOWN is 27", () => expect(EXIT_TEARDOWN).toBe(27));

  it("eXIT_INVALID_NAME is 28", () => expect(EXIT_INVALID_NAME).toBe(28));

  it("eXIT_BAD_ARGUMENTS is 29", () => expect(EXIT_BAD_ARGUMENTS).toBe(29));

  it("eXIT_PACKAGE_INSTALL is 30", () => expect(EXIT_PACKAGE_INSTALL).toBe(30));

  it("eXIT_REPO_INITIALISATION is 31", () => expect(EXIT_REPO_INITIALISATION).toBe(31));
});

describe("no duplicate values across all constants", () => {
  it("every constant has a unique numeric value", () => {
    const codes = [
      EXIT_SUCCESS,
      EXIT_TARGET_EXISTS,
      EXIT_UNSUPPORTED,
      EXIT_INVALID_MULTI_SELECT,
      EXIT_LAYER,
      EXIT_SCAFFOLD_WRITE,
      EXIT_MANIFEST,
      EXIT_REGISTRATION,
      EXIT_USAGE,
      EXIT_CONFIG,
      EXIT_CREDENTIALS,
      EXIT_STORAGE,
      EXIT_OUTPUT_DIR,
      EXIT_GIT,
      EXIT_ALIAS,
      EXIT_DEPLOY_NOT_FOUND,
      EXIT_CONFIRM,
      EXIT_PARTIAL,
      EXIT_DEPLOYMENT,
      EXIT_PROMOTION,
      EXIT_ROLLBACK,
      EXIT_LOGS,
      EXIT_STATUS,
      EXIT_LIST,
      EXIT_TEARDOWN,
      EXIT_INVALID_NAME,
      EXIT_BAD_ARGUMENTS,
      EXIT_PACKAGE_INSTALL,
      EXIT_REPO_INITIALISATION,
    ];
    expect(new Set(codes).size).toBe(codes.length);
  });
});
