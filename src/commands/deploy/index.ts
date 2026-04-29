import { readFile as nodeReadFile } from "node:fs/promises";
import { join } from "node:path";
import { log as clackLog } from "@clack/prompts";
import type { IdentityResolver } from "../../auth/identity-resolver.port.js";
import { ConfigError, CredentialError, PartialUploadError } from "../../errors/cli-errors.js";
import { buildEnvelope } from "../../output/envelope.js";
import { parsePlatformYaml } from "../../platform/platform-yaml-v2.js";
import type { DeployMode, ProxyClient } from "../../platform/proxy-client.port.js";
import type { HandlerResult } from "../create/index.js";
import type { RunBuildOptions, RunBuildResult } from "./build.js";
import { runBuild as defaultRunBuild } from "./build.js";
import type { GitState } from "./git.js";
import { getGitState as defaultGetGitState } from "./git.js";
import { createIgnoreFilter } from "./ignore.js";
import type { UploadFilesOptions, UploadFilesResult } from "./upload.js";
import { uploadFiles as defaultUploadFiles } from "./upload.js";
import type { WalkedFile } from "./walk.js";
import { walkFiles as defaultWalkFiles } from "./walk.js";

interface DeployLog {
  info: (msg: string) => void;
  success: (msg: string) => void;
  warn: (msg: string) => void;
}

interface DeployOptions {
  cwd: string;
  dir?: string;
  json: boolean;
  promote?: boolean;
}

interface DeployDeps {
  getGitState?: () => GitState;
  identityResolver: IdentityResolver;
  log?: DeployLog;
  proxyClient: ProxyClient;
  readFile?: (path: string) => Promise<string>;
  runBuild?: (options: RunBuildOptions) => Promise<RunBuildResult>;
  uploadFiles?: (options: UploadFilesOptions) => Promise<UploadFilesResult>;
  walkFiles?: (dir: string) => WalkedFile[];
  write?: (text: string) => void;
}

const defaultReadFileFn = (path: string): Promise<string> => nodeReadFile(path, "utf-8");

const handleDeploy = async (opts: DeployOptions, deps: DeployDeps): Promise<HandlerResult> => {
  const logObj = deps.log ?? clackLog;
  const read = deps.readFile ?? defaultReadFileFn;
  const git = deps.getGitState ?? defaultGetGitState;
  const build = deps.runBuild ?? defaultRunBuild;
  const walk = deps.walkFiles ?? defaultWalkFiles;
  const upload = deps.uploadFiles ?? defaultUploadFiles;

  // 1. Resolve identity
  const identity = await deps.identityResolver.resolve();
  if (identity === null) {
    throw new CredentialError("Not authenticated. Run `universe login` first.");
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

  // 3. Verify site authorization
  const me = await deps.proxyClient.whoami();
  if (!me.authorizedSites.includes(config.site)) {
    const siteList = me.authorizedSites.length > 0 ? me.authorizedSites.join(", ") : "(none)";
    throw new CredentialError(
      `User "${me.login}" is not authorized to deploy to site "${config.site}". ` +
        `Authorized sites: ${siteList}. ` +
        `See freeCodeCamp/infra/blob/main/docs/runbooks/01-deploy-new-constellation-site.md`,
    );
  }

  // 4. Check git state
  const gitState = git();
  if (gitState.dirty) {
    logObj.warn(
      "Working tree has uncommitted changes — the deploy may not match your local state.",
    );
  }

  // 5. Build
  const buildResult = await build({
    command: config.build.command,
    cwd: opts.cwd,
    outputDir: opts.dir ?? config.build.output,
  });

  // 6. Walk and filter files
  const allFiles = walk(buildResult.outputDir);
  const shouldIgnore = createIgnoreFilter(config.deploy.ignore);
  const files = allFiles.filter((f) => !shouldIgnore(f.relPath));

  // 7. Initialise deploy session
  const sha = gitState.hash ?? `nogit-${Date.now().toString(36)}`;
  const { deployId, jwt } = await deps.proxyClient.deployInit({
    files: files.map((f) => f.relPath),
    sha,
    site: config.site,
  });

  // 8. Upload files
  const uploadResult = await upload({
    client: deps.proxyClient,
    deployId,
    files,
    jwt,
  });
  if (uploadResult.errors.length > 0) {
    throw new PartialUploadError(
      `${uploadResult.errors.length} file(s) failed to upload:\n${uploadResult.errors.join("\n")}`,
    );
  }

  // 9. Finalise deploy
  let deployMode: DeployMode;
  if (opts.promote === true) {
    deployMode = "production";
  } else if (config.deploy.preview) {
    deployMode = "preview";
  } else {
    deployMode = "production";
  }
  const finalizeResult = await deps.proxyClient.deployFinalize({
    deployId,
    files: files.map((f) => f.relPath),
    jwt,
    mode: deployMode,
  });

  // 10. Emit output
  const summary = {
    deployId,
    site: config.site,
    totalFiles: files.length,
    totalSize: uploadResult.totalSize,
    url: finalizeResult.url,
  };

  if (opts.json) {
    const envelope = buildEnvelope("static deploy", true, summary);
    const write =
      deps.write ??
      ((text: string): void => {
        process.stdout.write(text);
      });
    write(`${JSON.stringify(envelope)}\n`);
  } else {
    logObj.success(
      `Deployed "${config.site}" → ${finalizeResult.url} (${files.length} files, ${uploadResult.totalSize} bytes)`,
    );
  }

  return { exitCode: 0, output: "" };
};

export { handleDeploy, type DeployDeps, type DeployLog, type DeployOptions };
