import { log as clackLog } from "@clack/prompts";
import type { IdentityResolver } from "../../auth/identity-resolver.port.js";
import { CredentialError } from "../../errors/cli-errors.js";
import { buildEnvelope, buildErrorEnvelope } from "../../output/envelope.js";
import { wrapProxyError } from "../../platform/proxy-client.port.js";
import type { ProxyClient, WhoAmIResponse } from "../../platform/proxy-client.port.js";
import type { HandlerResult } from "../create/index.js";

interface WhoamiLog {
  info: (msg: string) => void;
  success: (msg: string) => void;
  warn: (msg: string) => void;
}

interface WhoamiOptions {
  json: boolean;
}

interface WhoamiDeps {
  identityResolver: IdentityResolver;
  log?: WhoamiLog;
  proxyClient: ProxyClient;
  write?: (text: string) => void;
}

const handleWhoami = async (opts: WhoamiOptions, deps: WhoamiDeps): Promise<HandlerResult> => {
  const logObj = deps.log ?? clackLog;
  const writeFn =
    deps.write ??
    ((text: string): void => {
      process.stdout.write(text);
    });

  // 1. Resolve identity
  const identity = await deps.identityResolver.resolve();
  if (identity === null) {
    throw new CredentialError("Not authenticated. Run `universe login` first.");
  }

  // 2. Fetch whoami
  let me: WhoAmIResponse;
  try {
    me = await deps.proxyClient.whoami();
  } catch (err) {
    if (opts.json) {
      const { code, message } = wrapProxyError("whoami", err);
      const envelope = buildErrorEnvelope("whoami", code, message);
      writeFn(`${JSON.stringify(envelope)}\n`);
    }
    throw err;
  }

  // 3. Emit output
  if (opts.json) {
    const envelope = buildEnvelope("whoami", true, {
      authorizedSites: me.authorizedSites,
      identitySource: identity.source,
      login: me.login,
    });
    writeFn(`${JSON.stringify(envelope)}\n`);
  } else {
    const sites =
      me.authorizedSites.length > 0 ? me.authorizedSites.join(", ") : "(no sites authorized)";

    logObj.success(
      [
        `Logged in as: ${me.login}`,
        `Authorized sites: ${sites}`,
        `Identity source: ${identity.source}`,
      ].join("\n"),
    );
  }

  return { exitCode: 0, output: "" };
};

export { handleWhoami, type WhoamiDeps, type WhoamiLog, type WhoamiOptions };
