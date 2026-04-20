const RUNTIME_OPTIONS = {
  NODE: "node",
  STATIC_WEB: "static_web",
} as const;

const FRAMEWORK_OPTIONS = {
  EXPRESS: "express",
  NONE: "none",
  REACT_VITE: "react-vite",
  TYPESCRIPT: "typescript",
} as const;

const DATABASE_OPTIONS = {
  NONE: "none",
  POSTGRESQL: "postgresql",
  REDIS: "redis",
} as const;

const PLATFORM_SERVICE_OPTIONS = {
  ANALYTICS: "analytics",
  AUTH: "auth",
  EMAIL: "email",
  NONE: "none",
} as const;

const PACKAGE_MANAGER_OPTIONS = {
  BUN: "bun",
  PNPM: "pnpm",
} as const;

type RuntimeOption = (typeof RUNTIME_OPTIONS)[keyof typeof RUNTIME_OPTIONS];

type FrameworkOption = (typeof FRAMEWORK_OPTIONS)[keyof typeof FRAMEWORK_OPTIONS];

type DatabaseOption = (typeof DATABASE_OPTIONS)[keyof typeof DATABASE_OPTIONS];

type PlatformServiceOption =
  (typeof PLATFORM_SERVICE_OPTIONS)[keyof typeof PLATFORM_SERVICE_OPTIONS];

type PackageManagerOption = (typeof PACKAGE_MANAGER_OPTIONS)[keyof typeof PACKAGE_MANAGER_OPTIONS];

const RUNTIME_LABELS = {
  [RUNTIME_OPTIONS.NODE]: "Node.js (TypeScript)",
  [RUNTIME_OPTIONS.STATIC_WEB]: "Static (HTML/CSS/JS)",
} as const satisfies Record<RuntimeOption, string>;

const FRAMEWORK_LABELS = {
  [FRAMEWORK_OPTIONS.EXPRESS]: "Express",
  [FRAMEWORK_OPTIONS.NONE]: "None",
  [FRAMEWORK_OPTIONS.REACT_VITE]: "React (Vite)",
  [FRAMEWORK_OPTIONS.TYPESCRIPT]: "TypeScript",
} as const satisfies Record<FrameworkOption, string>;

const DATABASE_LABELS = {
  [DATABASE_OPTIONS.NONE]: "None",
  [DATABASE_OPTIONS.POSTGRESQL]: "PostgreSQL",
  [DATABASE_OPTIONS.REDIS]: "Redis",
} as const satisfies Record<DatabaseOption, string>;

const PLATFORM_SERVICE_LABELS = {
  [PLATFORM_SERVICE_OPTIONS.ANALYTICS]: "Analytics",
  [PLATFORM_SERVICE_OPTIONS.AUTH]: "Auth",
  [PLATFORM_SERVICE_OPTIONS.EMAIL]: "Email",
  [PLATFORM_SERVICE_OPTIONS.NONE]: "None",
} as const satisfies Record<PlatformServiceOption, string>;

const PACKAGE_MANAGER_LABELS = {
  [PACKAGE_MANAGER_OPTIONS.BUN]: "bun",
  [PACKAGE_MANAGER_OPTIONS.PNPM]: "pnpm",
} as const satisfies Record<PackageManagerOption, string>;

interface CreateSelections {
  name: string;
  runtime: RuntimeOption;
  framework: FrameworkOption;
  databases: DatabaseOption[];
  platformServices: PlatformServiceOption[];
  confirmed: boolean;
  packageManager?: PackageManagerOption;
}

interface Prompt {
  promptForCreateInputs(): Promise<CreateSelections | null>;
}

export {
  DATABASE_LABELS,
  DATABASE_OPTIONS,
  FRAMEWORK_LABELS,
  FRAMEWORK_OPTIONS,
  PACKAGE_MANAGER_LABELS,
  PACKAGE_MANAGER_OPTIONS,
  PLATFORM_SERVICE_LABELS,
  PLATFORM_SERVICE_OPTIONS,
  RUNTIME_LABELS,
  RUNTIME_OPTIONS,
};
export type {
  CreateSelections,
  DatabaseOption,
  FrameworkOption,
  PackageManagerOption,
  PlatformServiceOption,
  Prompt,
  RuntimeOption,
};
