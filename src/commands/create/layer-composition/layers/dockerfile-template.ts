interface DockerfileData {
  baseImage?: string;
  devCmd?: string[];
  devCopySource?: string;
  devInstall?: string;
}

const renderDockerfile = (data: Required<DockerfileData>): string =>
  `FROM ${data.baseImage} AS base\n` +
  `WORKDIR /app\n` +
  `\n` +
  `FROM base AS dev\n` +
  `${data.devInstall}\n` +
  `${data.devCopySource}\n` +
  `CMD ${JSON.stringify(data.devCmd)}\n`;

export { renderDockerfile };
export type { DockerfileData };
