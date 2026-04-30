import { readFile as nodeReadFile } from "node:fs/promises";
import { join } from "node:path";
import { log as clackLog } from "@clack/prompts";
import type { IdentityResolver } from "../../auth/identity-resolver.port.js";
import { ConfigError, CredentialError } from "../../errors/cli-errors.js";
import { buildEnvelope } from "../../output/envelope.js";
import { parsePlatformYaml } from "../../platform/platform-yaml-v2.js";
import type { ProxyClient } from "../../platform/proxy-client.port.js";
import type { HandlerResult } from "../create/index.js";

interface PromoteLog {
  info: (msg: string) => void;
  success: (msg: string) => void;
  warn: (msg: string) => void;
}

interface PromoteOptions {
  cwd: string;
  from?: string;
  json: boolean;
}

interface PromoteDeps {
  identityResolver: IdentityResolver;
  log?: PromoteLog;
  proxyClient: ProxyClient;
  readFile?: (path: string) => Promise<string>;
  write?: (text: string) => void;
}

const defaultReadFileFn = (path: string): Promise<string> => nodeReadFile(path, "utf-8");

const handlePromote = async (opts: PromoteOptions, deps: PromoteDeps): Promise<HandlerResult> => {
  const logObj = deps.log ?? clackLog;
  const read = deps.readFile ?? defaultReadFileFn;

  // 1. Resolve identity
  const identity = await deps.identityResolver.resolve();
  if (identity === null) {
    throw new CredentialError(
      "No GitHub identity available. Run `universe login`, set $GITHUB_TOKEN, or install the gh CLI.",
    );
  }

  // 2. Read and parse platform.yaml
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

  // 3. Promote
  // Per ADR-016: artemis promote endpoint copies preview alias to
  // production. To promote a *specific* prior deploy id, the alias
  // must be rewritten directly — the rollback endpoint is the
  // server-side primitive for that. Same atomic single-PUT.
  const result =
    opts.from === undefined
      ? await deps.proxyClient.sitePromote({ site: config.site })
      : await deps.proxyClient.siteRollback({ site: config.site, to: opts.from });

  // 4. Emit output
  const summary = {
    deployId: result.deployId,
    identitySource: identity.source,
    site: config.site,
    url: result.url,
  };

  if (opts.json) {
    const envelope = buildEnvelope("promote", true, summary);
    const write =
      deps.write ??
      ((text: string): void => {
        process.stdout.write(text);
      });
    write(`${JSON.stringify(envelope)}\n`);
  } else {
    logObj.success(
      [
        `Promoted ${result.deployId} to production`,
        ``,
        `  Site:        ${config.site}`,
        `  Deploy:      ${result.deployId}`,
        `  Production:  ${result.url}`,
      ].join("\n"),
    );
  }

  return { exitCode: 0, output: "" };
};

export { handlePromote, type PromoteDeps, type PromoteLog, type PromoteOptions };
