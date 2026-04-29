import { readFile as nodeReadFile } from "node:fs/promises";
import { join } from "node:path";
import { log as clackLog } from "@clack/prompts";
import type { IdentityResolver } from "../../auth/identity-resolver.port.js";
import { ConfigError, CredentialError } from "../../errors/cli-errors.js";
import { buildEnvelope } from "../../output/envelope.js";
import { parsePlatformYaml } from "../../platform/platform-yaml-v2.js";
import type { DeploySummary, ProxyClient } from "../../platform/proxy-client.port.js";
import type { HandlerResult } from "../create/index.js";

interface ListLog {
  info: (msg: string) => void;
  success: (msg: string) => void;
  warn: (msg: string) => void;
}

interface ListOptions {
  cwd: string;
  json: boolean;
  site?: string;
}

interface ListDeps {
  identityResolver: IdentityResolver;
  log?: ListLog;
  proxyClient: ProxyClient;
  readFile?: (path: string) => Promise<string>;
  write?: (text: string) => void;
}

const defaultReadFileFn = (path: string): Promise<string> => nodeReadFile(path, "utf-8");

const handleList = async (opts: ListOptions, deps: ListDeps): Promise<HandlerResult> => {
  const logObj = deps.log ?? clackLog;
  const read = deps.readFile ?? defaultReadFileFn;

  // 1. Resolve identity
  const identity = await deps.identityResolver.resolve();
  if (identity === null) {
    throw new CredentialError("Not authenticated. Run `universe login` first.");
  }

  // 2. Resolve site name — from --site flag or platform.yaml
  let site: string;
  if (opts.site === undefined) {
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
    ({ site } = parseResult.value);
  } else {
    ({ site } = opts);
  }

  // 3. Fetch deploys
  const deploys: DeploySummary[] = await deps.proxyClient.siteDeploys({ site });

  // 4. Emit output
  if (opts.json) {
    const envelope = buildEnvelope("static list", true, {
      deploys,
      site,
    });
    const write =
      deps.write ??
      ((text: string): void => {
        process.stdout.write(text);
      });
    write(`${JSON.stringify(envelope)}\n`);
  } else {
    for (const d of deploys) {
      logObj.info(d.deployId);
    }
  }

  return { exitCode: 0, output: "" };
};

export { handleList, type ListDeps, type ListLog, type ListOptions };
