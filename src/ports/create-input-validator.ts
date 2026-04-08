import type { CreateSelections } from "./prompt-port.js";

interface CreateInputValidator {
  validateCreateInput(input: CreateSelections): CreateSelections;
}

export type { CreateInputValidator };
