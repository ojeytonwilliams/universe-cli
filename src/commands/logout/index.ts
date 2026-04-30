import { log as clackLog } from "@clack/prompts";
import type { TokenStore } from "../../auth/token-store.port.js";
import { buildEnvelope } from "../../output/envelope.js";
import type { HandlerResult } from "../create/index.js";

interface LogoutLog {
  info: (msg: string) => void;
  success: (msg: string) => void;
  warn: (msg: string) => void;
}

interface LogoutOptions {
  json: boolean;
}

interface LogoutDeps {
  log?: LogoutLog;
  tokenStore: TokenStore;
  write?: (text: string) => void;
}

const handleLogout = async (opts: LogoutOptions, deps: LogoutDeps): Promise<HandlerResult> => {
  const logObj = deps.log ?? clackLog;

  const removed = (await deps.tokenStore.loadToken()) !== null;

  await deps.tokenStore.deleteToken();

  if (opts.json) {
    const envelope = buildEnvelope("logout", true, { removed });
    const write =
      deps.write ??
      ((text: string): void => {
        process.stdout.write(text);
      });
    write(`${JSON.stringify(envelope)}\n`);
  } else if (removed) {
    logObj.success("Logged out. Stored token removed.");
  } else {
    logObj.info("No token was stored. Nothing to remove.");
  }

  return { exitCode: 0, output: "" };
};

export { handleLogout, type LogoutDeps, type LogoutLog, type LogoutOptions };
