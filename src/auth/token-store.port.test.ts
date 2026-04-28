import type { TokenStore } from "./token-store.port.js";

describe("token-store port", () => {
  it("is implementable with a conforming object", () => {
    const store: TokenStore = {
      deleteToken: () => Promise.resolve(),
      loadToken: () => Promise.resolve(null),
      saveToken: () => Promise.resolve(),
    };
    expect(store).toBeDefined();
  });
});
