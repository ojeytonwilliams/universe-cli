import { baseStaticLayer } from "./base-static-layer.js";

describe("baseStaticLayer dockerfileData", () => {
  it("uses node:22-alpine as base image", () => {
    expect(baseStaticLayer.dockerfileData?.baseImage).toBe("node:22-alpine");
  });

  it("copies the public directory", () => {
    expect(baseStaticLayer.dockerfileData?.devCopySource).toBe("COPY public public");
  });

  it("serves with npx serve on port 3000", () => {
    expect(baseStaticLayer.dockerfileData?.devCmd).toStrictEqual([
      "npx",
      "serve",
      "public",
      "-l",
      "3000",
    ]);
  });

  it("has no install step", () => {
    expect(baseStaticLayer.dockerfileData?.devInstall).toBe("");
  });
});
