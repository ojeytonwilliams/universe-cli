type RuntimeOption = "Node.js (TypeScript)" | "Static (HTML/CSS/JS)";

type FrameworkOption = "Express" | "None";

type DatabaseOption = "PostgreSQL" | "Redis" | "None";

type PlatformServiceOption = "Auth" | "Email" | "Analytics" | "None";

interface CreateSelections {
  name: string;
  runtime: RuntimeOption;
  framework: FrameworkOption;
  databases: DatabaseOption[];
  platformServices: PlatformServiceOption[];
  confirmed: boolean;
}

interface PromptPort {
  promptForCreateInputs(): Promise<CreateSelections | null>;
}

export type {
  CreateSelections,
  DatabaseOption,
  FrameworkOption,
  PlatformServiceOption,
  PromptPort,
  RuntimeOption,
};
