import { z } from "zod";

const AlwaysSchema = z.strictObject({
  files: z.record(z.string(), z.string()),
});
type Always = z.infer<typeof AlwaysSchema>;

const DatabaseOptionSchema = z.literal(["postgresql", "redis"]);
type DatabaseOption = z.infer<typeof DatabaseOptionSchema>;

const DatabaseSchema = z.record(DatabaseOptionSchema, z.record(z.string(), z.string()));
type Database = z.infer<typeof DatabaseSchema>;

const RUNTIME_OPTIONS = { NODE: "node", STATIC_WEB: "static_web" } as const;
const RuntimeOptionSchema = z.literal(Object.values(RUNTIME_OPTIONS));
type RuntimeOption = z.infer<typeof RuntimeOptionSchema>;
const RuntimeSchema = z.record(
  RuntimeOptionSchema,
  z.strictObject({
    baseImage: z.string(),
    databases: z.array(z.string()),
    files: z.record(z.string(), z.string()),
    frameworks: z.array(z.string()),
    packageManagers: z.array(z.string()),
    services: z.array(z.string()),
  }),
);
type Runtime = z.infer<typeof RuntimeSchema>;

const PackageManagerOptionSchema = z.literal(["bun", "pnpm"]);
type PackageManagerOption = z.infer<typeof PackageManagerOptionSchema>;
const PackageManagerSchema = z.record(
  PackageManagerOptionSchema,
  z.strictObject({
    devCmd: z.array(z.string()),
    devInstall: z.string(),
    files: z.record(z.string(), z.string()),
    preinstall: z.string().optional(),
    watchRebuild: z.array(z.strictObject({ path: z.string() })),
  }),
);
type PackageManager = z.infer<typeof PackageManagerSchema>;

const ServiceOptionSchema = z.literal(["analytics", "auth", "email"]);
type ServiceOption = z.infer<typeof ServiceOptionSchema>;
const ServiceSchema = z.record(ServiceOptionSchema, z.record(z.string(), z.string()));
type Service = z.infer<typeof ServiceSchema>;

const FrameworkOptionSchema = z.literal(["express", "html-css-js", "react-vite", "typescript"]);
type FrameworkOption = z.infer<typeof FrameworkOptionSchema>;
const FrameworkSchema = z.record(
  FrameworkOptionSchema,
  z.strictObject({
    devCopySource: z.string(),
    files: z.record(z.string(), z.string()),
    port: z.number(),
    watchSync: z.array(z.strictObject({ path: z.string(), target: z.string() })),
  }),
);
type Framework = z.infer<typeof FrameworkSchema>;

export {
  AlwaysSchema,
  DatabaseSchema,
  FrameworkSchema,
  RuntimeSchema,
  PackageManagerSchema,
  ServiceSchema,
  RUNTIME_OPTIONS,
};
export type {
  Always,
  Database,
  DatabaseOption,
  Runtime,
  RuntimeOption,
  Framework,
  FrameworkOption,
  PackageManager,
  PackageManagerOption,
  Service,
  ServiceOption,
};
