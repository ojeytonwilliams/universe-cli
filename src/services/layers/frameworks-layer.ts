import { DEPENDENCY_VERSIONS } from "./dependency-versions.js";

const frameworksLayer = {
  "frameworks/express": {
    "package.json": JSON.stringify({
      dependencies: {
        express: DEPENDENCY_VERSIONS.express,
      },
    }),
  },
  "frameworks/none": {},
};

export { frameworksLayer };
