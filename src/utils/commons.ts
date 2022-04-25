import { PR_TYPES } from "../types";
import type { Commits, SplitCommits } from "../types"

const getPrNumber = (prTitle: string): string => {
  const regex = /#[0-9]+/;
  const [prNumber] = regex.exec(prTitle) as Array<string>;

  return prNumber.replace("#", "");
};

const getPrType = (prTitle: string): PR_TYPES => {
  const lowerPrTitle = prTitle.toLowerCase();

  const type = Object.entries(PR_TYPES).reduce((acc, cur) => {
    const regex = new RegExp(cur[0], "g");
    return regex.test(lowerPrTitle) ? cur : acc;
  });

  return type ? type[1] : PR_TYPES.others;
};

const getPrDescription = (prRawDescription) =>
  prRawDescription.split(":").slice(-1)[0].trim();

const splitCommitsByType = (rawCommits: Commits): SplitCommits => {
  const commits = Object.values(PR_TYPES).reduce((acc, cur) => {
    acc[cur] = [];
    return acc;
  }, {});

  rawCommits.forEach((commit) => commits[commit.type].push(commit));

  return commits as SplitCommits;
};

export { getPrNumber, getPrType, getPrDescription, splitCommitsByType };
