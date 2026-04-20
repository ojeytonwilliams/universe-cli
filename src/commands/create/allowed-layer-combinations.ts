import { z } from "zod";
import raw from "./allowed-layer-combinations.json" with { type: "json" };

const RuntimeCombinationsSchema = z.object({
  databases: z.array(z.string()),
  frameworks: z.array(z.string()),
  packageManagers: z.array(z.string()),
  platformServices: z.array(z.string()),
});

const AllowedCombinationsSchema = z.record(z.string(), RuntimeCombinationsSchema);

type RuntimeCombinations = z.infer<typeof RuntimeCombinationsSchema>;

const allowedCombinations = AllowedCombinationsSchema.parse(raw);

export { allowedCombinations };
export type { RuntimeCombinations };
