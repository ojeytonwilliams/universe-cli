import { readFile as nodeReadFile } from "node:fs/promises";
import { join } from "node:path";
import { log as clackLog } from "@clack/prompts";
import type { IdentityResolver } from "../../auth/identity-resolver.port.js";
import { BadArgumentsError, ConfigError, CredentialError } from "../../errors/cli-errors.js";
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

  // 1. Validate --to flag
  if (opts.to === undefined) {
    throw new BadArgumentsError("--to <deployId> is required for rollback.");
  }

  // 2. Resolve identity
  const identity = await deps.identityResolver.resolve();
  if (identity === null) {
    throw new CredentialError("Not authenticated. Run `universe login` first.");
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
  const aliasResult = await deps.proxyClient.siteRollback({ site: config.site, to: opts.to });

  // 5. Emit output
  const summary = {
    deployId: aliasResult.deployId,
    site: config.site,
    to: opts.to,
    url: aliasResult.url,
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
    logObj.success(`Rolled back "${config.site}" to ${opts.to} → ${aliasResult.url}`);
  }

  return { exitCode: 0, output: "" };
};

export { handleRollback, type RollbackDeps, type RollbackLog, type RollbackOptions };
