import type { DockerfileData } from "./layers/dockerfile-template.js";
import type {
  FrameworkLayerData,
  PackageManagerLayerData,
  RuntimeLayerData,
} from "./layers/layer-types.js";

const buildDockerfileData = (
  runtime: RuntimeLayerData,
  framework: FrameworkLayerData,
  packageManager: PackageManagerLayerData,
): Required<DockerfileData> => ({
  baseImage: runtime.baseImage,
  devCmd: packageManager.devCmd,
  devCopySource: framework.devCopySource,
  devInstall: packageManager.devInstall,
});

export { buildDockerfileData };
