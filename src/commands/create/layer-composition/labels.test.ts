import { getLabel } from "./labels.js";

describe(getLabel, () => {
  it("should return the correct label for a given key", () => {
    expect(getLabel("runtime", "node")).toBe("Node.js");
    expect(getLabel("framework", "frameworks/express")).toBe("Express");
  });
});
