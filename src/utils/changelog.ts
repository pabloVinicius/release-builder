const fs = require("fs");
import type { SplitCommits } from "../types"

const createChangelogContent = (
  commits: SplitCommits,
  releaseVersion: string,
  repoUrl: string
) => {
  const {
    FIX: fixes,
    FEATURE: features,
    IMPROVEMENT: improvements,
    OTHERS: others,
  } = commits;

  const newVersionChangelog = `# v${releaseVersion}
${
  features.length > 0
    ? `
**Features**
${features
  .map(
    ({ number, description }) =>
      `- [#${number}](${repoUrl}/${number}) ${description}`
  )
  .join("\n")}`
    : ""
}
${
  improvements.length > 0
    ? `
**Improvements**
${improvements
  .map(
    ({ number, description }) =>
      `- [#${number}](${repoUrl}/${number}) ${description}`
  )
  .join("\n")}`
    : ""
}
${
  fixes.length > 0
    ? `
**Fixes**
${fixes
  .map(
    ({ number, description }) =>
      `- [#${number}](${repoUrl}/${number}) ${description}`
  )
  .join("\n")}`
    : ""
}
${
  others.length > 0
    ? `
**Others**
${others
  .map(
    ({ number, description }) =>
      `- [#${number}](${repoUrl}/${number}) ${description}`
  )
  .join("\n")}`
    : ""
}
`;
  return newVersionChangelog;
};

const writeChangelogFile = (content: string, path: string) => {
  try {
    const previousContentText = fs.readFileSync(path).toString();
    const previousContentWithoutTitle = previousContentText.substring(
      previousContentText.indexOf("\n") + 1
    );

    const finalContent = `# Minded Patient UI\n\n${content}${previousContentWithoutTitle}`;
    const finalContentBuffer = Buffer.from(finalContent);

    const fd = fs.openSync(path, "w+");

    fs.writeSync(fd, finalContentBuffer, 0, finalContentBuffer.length, 0);
    fs.close(fd);
  } catch (err) {
    const finalContent = `# Minded Patient UI\n\n${content}`;
    fs.writeFileSync(path, finalContent);
  }
};

export { createChangelogContent, writeChangelogFile }