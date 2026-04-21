const RUNTIME_OPTIONS = {
  NODE: "node",
  STATIC_WEB: "static_web",
} as const;

const FRAMEWORK_OPTIONS = {
  EXPRESS: "express",
  HTML_CSS_JS: "html-css-js",
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
  DATABASE_OPTIONS,
  FRAMEWORK_OPTIONS,
  PACKAGE_MANAGER_OPTIONS,
  PLATFORM_SERVICE_OPTIONS,
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
