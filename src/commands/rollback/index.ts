import { readFile as nodeReadFile } from "node:fs/promises";
import { join } from "node:path";
import { log as clackLog } from "@clack/prompts";
import type { IdentityResolver } from "../../auth/identity-resolver.port.js";
import { ConfigError, CredentialError, UsageError } from "../../errors/cli-errors.js";
import { buildEnvelope } from "../../output/envelope.js";
import { parsePlatformYaml } from "../../platform/platform-yaml-v2.js";
import type { ProxyClient } from "../../platform/proxy-client.port.js";
import type { HandlerResult } from "../create/index.js";

interface RollbackLog {
  info: (msg: string) => void;
  success: (msg: string) => void;
  warn: (msg: string) => void;
}

interface RollbackOptions {
  cwd: string;
  json: boolean;
  to: string | undefined;
}

interface RollbackDeps {
  identityResolver: IdentityResolver;
  log?: RollbackLog;
  proxyClient: ProxyClient;
  readFile?: (path: string) => Promise<string>;
  write?: (text: string) => void;
}

const defaultReadFileFn = (path: string): Promise<string> => nodeReadFile(path, "utf-8");

const handleRollback = async (
  opts: RollbackOptions,
  deps: RollbackDeps,
): Promise<HandlerResult> => {
  const logObj = deps.log ?? clackLog;
  const read = deps.readFile ?? defaultReadFileFn;
  const to = opts.to?.trim();

  // 1. Validate --to flag
  if (to === undefined || to === "") {
    throw new UsageError(
      "rollback requires --to <deployId>. Run `universe static ls` to list past deploys.",
    );
  }

  // 2. Resolve identity
  const identity = await deps.identityResolver.resolve();
  if (identity === null) {
    throw new CredentialError(
      "No GitHub identity available. Run `universe login`, set $GITHUB_TOKEN, or install the gh CLI.",
    );
  }

  // 3. Read and parse platform.yaml
  let rawYaml: string;
  try {
    rawYaml = await read(join(opts.cwd, "platform.yaml"));
  } catch {
    throw new ConfigError(
      "platform.yaml not found. Run this command from the project root containing platform.yaml.",
    );
  }

  const parseResult = parsePlatformYaml(rawYaml);
  if (!parseResult.ok) {
    throw new ConfigError(parseResult.error);
  }
  const config = parseResult.value;

  // 4. Rollback
  const result = await deps.proxyClient.siteRollback({ site: config.site, to });

  // 5. Emit output
  const summary = {
    deployId: result.deployId,
    identitySource: identity.source,
    site: config.site,
    url: result.url,
  };

  if (opts.json) {
    const envelope = buildEnvelope("static rollback", true, summary);
    const write =
      deps.write ??
      ((text: string): void => {
        process.stdout.write(text);
      });
    write(`${JSON.stringify(envelope)}\n`);
  } else {
    logObj.success(
      [
        `Rolled production back to ${result.deployId}`,
        ``,
        `  Site:        ${config.site}`,
        `  Deploy:      ${result.deployId}`,
        `  Production:  ${result.url}`,
      ].join("\n"),
    );
  }

  return { exitCode: 0, output: "" };
};

export { handleRollback, type RollbackDeps, type RollbackLog, type RollbackOptions };
