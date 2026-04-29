import { log as clackLog } from "@clack/prompts";
import type { DeviceFlow } from "../../auth/device-flow.port.js";
import type { IdentityResolver } from "../../auth/identity-resolver.port.js";
import type { TokenStore } from "../../auth/token-store.port.js";
import { ConfirmError } from "../../errors/cli-errors.js";
import { DEFAULT_GH_CLIENT_ID } from "../../constants.js";
import { buildEnvelope } from "../../output/envelope.js";
import type { HandlerResult } from "../create/index.js";

interface LoginLog {
  info: (msg: string) => void;
  success: (msg: string) => void;
  warn: (msg: string) => void;
}

interface LoginOptions {
  force: boolean;
  json: boolean;
}

interface LoginDeps {
  deviceFlow: DeviceFlow;
  identityResolver: IdentityResolver;
  log?: LoginLog;
  tokenStore: TokenStore;
  write?: (text: string) => void;
}

const handleLogin = async (opts: LoginOptions, deps: LoginDeps): Promise<HandlerResult> => {
  const logObj = deps.log ?? clackLog;
  const writeFn =
    deps.write ??
    ((text: string): void => {
      process.stdout.write(text);
    });

  // 1. Check for existing token unless --force
  if (!opts.force) {
    const existing = await deps.tokenStore.loadToken();
    if (existing !== null) {
      throw new ConfirmError("Already logged in. Use --force to re-authenticate.");
    }
  }

  // 2. Run device flow
  const clientId = process.env["UNIVERSE_GH_CLIENT_ID"] ?? DEFAULT_GH_CLIENT_ID;
  const token = await deps.deviceFlow.run({
    clientId,
    onPrompt: ({ expiresIn, userCode, verificationUri }) => {
      if (opts.json) {
        const envelope = buildEnvelope("login", true, {
          expiresIn,
          userCode,
          verificationUri,
        });
        writeFn(`${JSON.stringify(envelope)}\n`);
      } else {
        logObj.info(
          `Open ${verificationUri} and enter code: ${userCode} (expires in ${expiresIn}s)`,
        );
      }
    },
    scope: "read:user",
  });

  // 3. Persist token
  await deps.tokenStore.saveToken(token);

  // 4. Emit success
  if (opts.json) {
    const envelope = buildEnvelope("login", true, { stored: true });
    writeFn(`${JSON.stringify(envelope)}\n`);
  } else {
    logObj.success("Logged in successfully.");
  }

  return { exitCode: 0, output: "" };
};

export { handleLogin, type LoginDeps, type LoginLog, type LoginOptions };
