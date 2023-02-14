import type { Commits, OctokitClient, Repository } from "../types"
import { getPrDescription, getPrNumber, getPrType } from "./commons"


const getCommits = async (
  octokitClient: OctokitClient,
  repo: Repository
): Promise<Commits> => {
  const commitsRequest =
    await octokitClient.rest.repos.compareCommitsWithBasehead({
      ...repo,
      basehead: "staging...development",
    });

  const { commits: rawCommits } = commitsRequest.data;

  const mergeCommits = rawCommits.filter(({ commit }) =>
    /^Merge pull request/.test(commit.message)
  );

  const messages = mergeCommits.map(({ commit }) =>
    commit.message.split("\n\n")
  );

  const commits = messages.map(([prTitle, prRawDescription]) => {
    const type =  getPrType(prTitle);
    return {
      type,
      number: getPrNumber(prTitle),
      description: getPrDescription(prRawDescription, type),
    };
  });

  return commits;
};

const updatePullRequestDescription = (
  octokitClient: OctokitClient,
  prNumber: number,
  repo: Repository,
  prDescription: string
) => {
  octokitClient.rest.pulls.update({
    ...repo,
    pull_number: prNumber,
    body: prDescription,
  });
};

export { getCommits, updatePullRequestDescription };