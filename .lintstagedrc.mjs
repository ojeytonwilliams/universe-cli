import picomatch from "picomatch";

// oxlint-disable-next-line import/no-default-export import/no-anonymous-default-export
export default {
  "*.{js,jsx,ts,tsx,mjs,cjs}": (files) => {
    // Filter out ignored files
    const match = files.filter((f) => picomatch.isMatch(f, "files/**"));
    const matchingFiles = match.join(" ");

    return [`oxlint --fix ${matchingFiles}`, `oxfmt ${matchingFiles}`];
  },

  "!*.{js,jsx,ts,tsx,mjs,cjs}": (files) => {
    // Filter out ignored files
    const match = files.filter((f) => picomatch.isMatch(f, "files/**"));
    const matchingFiles = match.join(" ");

    return [`oxfmt --no-error-on-unmatched-pattern ${matchingFiles}`];
  },
};
