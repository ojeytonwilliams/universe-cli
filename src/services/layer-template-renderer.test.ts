import { LayerTemplateRenderer } from "./layer-template-renderer.js";

interface TemplateContext {
  framework: string;
  name: string;
  runtime: string;
}

const context: TemplateContext = {
  framework: "Express",
  name: "my-app",
  runtime: "Node.js (TypeScript)",
};

describe(LayerTemplateRenderer, () => {
  it("substitutes all defined variables in a template string", () => {
    const renderer = new LayerTemplateRenderer();

    const result = renderer.render(
      "name={{name}} runtime={{runtime}} framework={{framework}}",
      context,
    );

    expect(result).toBe("name=my-app runtime=Node.js (TypeScript) framework=Express");
  });

  it("leaves unknown placeholders unchanged", () => {
    const renderer = new LayerTemplateRenderer();

    const result = renderer.render("hello={{unknown}} name={{name}}", context);

    expect(result).toBe("hello={{unknown}} name=my-app");
  });

  it("substitutes multiple occurrences of the same variable", () => {
    const renderer = new LayerTemplateRenderer();

    const result = renderer.render("{{name}}/{{name}}.ts", context);

    expect(result).toBe("my-app/my-app.ts");
  });

  it("returns the template unchanged when given an empty context", () => {
    const renderer = new LayerTemplateRenderer();

    const result = renderer.render("hello={{name}}", { framework: "", name: "", runtime: "" });

    expect(result).toBe("hello=");
  });
});
