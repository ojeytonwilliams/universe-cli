# Further Work — `create` Command

These items were identified during the spike as areas that will need to be addressed before the `create` command is production-ready.

## E2E test strategy

The current e2e suite executes every allowed runtime/framework/service combination. This does not scale as the supported matrix grows, and will become a CI bottleneck.

Replace the exhaustive e2e matrix with:

- **Smoke tests** — a small number of representative `universe create` selections covering key paths (e.g. Node.js + Express + services, Node.js + None, Static).
- **Unit tests** — validate compatibility of all possible combinations at the layer-resolver level, where coverage is cheap and fast.

## Layer templating and serialisation

The current layer registry stores verbatim file content as strings. As layers grow in complexity, they will need:

- A **templating mechanism** to inject project-specific values (project name, runtime, framework) into layer files rather than doing post-hoc string replacement. Which engine (if any) TBD.
- **JSON/YAML serialisers** for config-file layers so merging and output are driven by structured data rather than raw string concatenation.

## `platform.yaml` schema

The manifest generator currently branches on runtime (app vs static) with no formal contract. Before expanding the supported matrix or connecting to a real platform, a versioned `platform.yaml` schema is needed to:

- Validate generated manifests against a known structure.
- Provide a stable migration path when the platform schema evolves.
- Decouple the generator from runtime-specific branching logic.
