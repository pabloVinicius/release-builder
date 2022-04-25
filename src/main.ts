import * as github from "@actions/github";
import * as core from "@actions/core";
const fs = require("fs");
const exec = require("child_process").exec;

enum PR_TYPES {
  fix = "FIX",
  feat = "FEATURE",
  feature = "FEATURE",
  improve = "IMPROVEMENT",
  others = "OTHERS",
}

interface Repository {
  owner: string;
  repo: string;
}

interface Commit {
  type: PR_TYPES;
  number: string;
  description: number;
}

type Commits = Array<Commit>;

type SplitCommits = Record<PR_TYPES, Array<Commit>>;

type OctokitClient = ReturnType<typeof github.getOctokit>;

const updateProjectVersion = (version: string) => {
  exec(`npm version ${version}`, (error, stdout, stderr) => {
    if (error != null) {
      core.setFailed(error);
    }
    if (stderr != null) {
      console.log(stderr);
    }
    console.log(stdout);
  });
};

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

  const commits = messages.map(([prTitle, prRawDescription]) => ({
    type: getPrType(prTitle),
    number: getPrNumber(prTitle),
    description: getPrDescription(prRawDescription),
  }));

  return commits;
};

const splitCommitsByType = (rawCommits: Commits): SplitCommits => {
  const commits = Object.values(PR_TYPES).reduce((acc, cur) => {
    acc[cur] = [];
    return acc;
  }, {});

  rawCommits.forEach((commit) => commits[commit.type].push(commit));

  return commits as SplitCommits;
};

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
