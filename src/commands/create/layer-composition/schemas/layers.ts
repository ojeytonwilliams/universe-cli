import { z } from "zod";

const AlwaysSchema = z.strictObject({
  files: z.record(z.string(), z.string()),
});
type Always = z.infer<typeof AlwaysSchema>;

const DatabaseSchema = z.array(z.string());
type Database = z.infer<typeof DatabaseSchema>;

const RuntimeSchema = z.record(
  z.string(),
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

const PackageManagerSchema = z.record(
  z.string(),
  z.strictObject({
    devCmd: z.array(z.string()),
    devInstall: z.string(),
    files: z.record(z.string(), z.string()),
    watchRebuild: z.array(z.strictObject({ path: z.string() })),
  }),
);
type PackageManager = z.infer<typeof PackageManagerSchema>;

const ServiceSchema = z.record(z.string(), z.record(z.string(), z.string()));
type Service = z.infer<typeof ServiceSchema>;

const FrameworkSchema = z.record(
  z.string(),
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
};
export type { Always, Database, Runtime, Framework, PackageManager, Service };
