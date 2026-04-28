import { DEFAULT_GH_CLIENT_ID, DEFAULT_PROXY_URL } from "./constants.js";

describe(DEFAULT_GH_CLIENT_ID, () => {
  it("is the public OAuth app client id", () => {
    expect(DEFAULT_GH_CLIENT_ID).toBe("Iv23liIuGmZRyPd5wUeN");
  });
});

describe(DEFAULT_PROXY_URL, () => {
  it("points to the artemis deploy proxy", () => {
    expect(DEFAULT_PROXY_URL).toBe("https://uploads.freecode.camp");
  });
});
