import * as github from "@actions/github";
import * as core from "@actions/core";
import {
  updateProjectVersion,
  getCommits,
  splitCommitsByType,
  createChangelogContent,
  updatePullRequestDescription,
  writeChangelogFile,
} from "./utils";

const main = async () => {
  const { repo, payload } = github.context;

  const { pull_request, repository } = payload;

  const releaseVersion = pull_request!.head.ref
    .split("/")
    .slice(-1)[0] as string;

  console.log(`Release version: ${releaseVersion}`);

  updateProjectVersion(releaseVersion);

  const token = core.getInput("token");
  const octokit = github.getOctokit(token);

  const commits = await getCommits(octokit, repo);
  const splitCommits = splitCommitsByType(commits);
  const newVersionChangelog = createChangelogContent(
    splitCommits,
    releaseVersion,
    `${repository!.html_url}/pull`
  );
  console.log(`New version changelog: ${newVersionChangelog}`);

  updatePullRequestDescription(
    octokit,
    pull_request!.number,
    repo,
    newVersionChangelog
  );
  writeChangelogFile(newVersionChangelog, "changelog.md");

  console.log(`Payload: ${payload}`);
  core.setOutput("changelog", newVersionChangelog);
};

try {
  main();
} catch (error: any) {
  console.log({ error });
  core.setFailed(error.message);
}
