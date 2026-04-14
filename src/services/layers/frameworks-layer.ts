const EXPRESS_VERSION = "^5";

const frameworksLayer = {
  "frameworks/express": {
    "package.json": JSON.stringify({
      dependencies: {
        express: EXPRESS_VERSION,
      },
    }),
  },
  "frameworks/none": {},
};

export { frameworksLayer };
