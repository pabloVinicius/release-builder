const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const exec = require('child_process').exec;

const PR_TYPES = {
  fix: "FIX",
  feat: "FEATURE",
  feature: "FEATURE",
  improve: "IMPROVEMENT",
}

const updateVersion = (version) => {
  exec(`npm version ${version}`, (error, stdout, stderr) => {
    if(error != null) {
      core.setFailed(error);
    }
    if(stderr != null) {
        console.log(stderr);
    }
    console.log(stdout);
  });
}

const getPrNumber = (prTitle) => {
  const regex = /#[0-9]+/;
  const [prNumber] = regex.exec(prTitle);

  return prNumber.replace("#", "");
}

const getPrType = (prTitle) => {
  const lowerPrTitle = prTitle.toLowerCase();

  const type = Object.entries(PR_TYPES).reduce((acc, cur) => {
    const regex = new RegExp(cur[0], "g");
    return regex.test(lowerPrTitle) ? cur : acc;
  }, undefined)[1];

  return type;
}

const getPrDescription = (prRawDescription) => prRawDescription.split(":").slice(-1)[0].trim();

const getCommits = async (octokitClient, repo) => {
  const commitsRequest = await octokitClient.repos.compareCommitsWithBasehead({
    ...repo,
    basehead: "staging...development",
  });

  const { commits: rawCommits } = commitsRequest.data;

  const mergeCommits = rawCommits.filter(({ commit }) => /^Merge pull request/.test(commit.message));

  const messages = mergeCommits.map(({ commit }) => commit.message.split('\n\n'))

  const commits = messages.map(([prTitle, prRawDescription]) => ({
    type: getPrType(prTitle),
    number: getPrNumber(prTitle),
    description: getPrDescription(prRawDescription)
  }));

  return commits;
}

const splitCommitsByType = (rawCommits) => {
  const commits = {
    FIX: [],
    FEATURE: [],
    IMPROVEMENT: [],
  };

  rawCommits.forEach((commit) => commits[commit.type].push(commit));

  return commits;
}

const createChangelogContent = (commits, releaseVersion, repoUrl) => {
  const { FIX: fixes, FEATURE: features, IMPROVEMENT: improvements } = commits;

  const newVersionChangelog = `# v${releaseVersion}
${features.length > 0 ? `
**Features**
${features.map(({ number, description }) => `- [#${number}](${repoUrl}/${number}) ${description}`).join("\n")}` : ""}
${improvements.length > 0 ? `
**Improvements**
${improvements.map(({ number, description }) => `- [#${number}](${repoUrl}/${number}) ${description}`).join("\n")}` : ""}
${fixes.length > 0 ? `
**Fixes**
${fixes.map(({ number, description }) => `- [#${number}](${repoUrl}/${number}) ${description}`).join("\n")}` : ""}
`
  return newVersionChangelog;
}

const writeChangelogFile = (content, path) => {
  try {
    const previousContentText = fs.readFileSync(path).toString();
    const previousContentWithoutTitle = previousContentText.substring(previousContentText.indexOf("\n") + 1)
      
    const finalContent = `# Minded Patient UI\n\n${content}${previousContentWithoutTitle}`;
    const finalContentBuffer = Buffer.from(finalContent);
    
    const fd = fs.openSync(path, 'w+');

    fs.writeSync(fd, finalContentBuffer, 0, finalContentBuffer.length, 0);
    fs.close(fd);
  } catch (err) {
    const finalContent = `# Minded Patient UI\n\n${content}`;
    fs.writeFileSync(path, finalContent);
  }
}

const main  = async () => {
  const { repo, payload } = github.context;

  const { pull_request, repository } = payload;

  const releaseVersion = pull_request.head.ref.split('/').slice(-1)[0];

  console.log(`Release version: ${releaseVersion}`)

  updateVersion(releaseVersion);

  const token = core.getInput("token");
  const octokit = github.getOctokit(token);

  const commits = await getCommits(octokit.rest, repo);
  const splitCommits = splitCommitsByType(commits);
  const newVersionChangelog = createChangelogContent(splitCommits, releaseVersion, `${repository.html_url}/pull`)
  console.log(`New version changelog: ${newVersionChangelog}`);

  writeChangelogFile(newVersionChangelog, "changelog.md");

  console.log(`Payload: ${payload}`)
  core.setOutput('changelog', newVersionChangelog);
}

try {
  main()
} catch (error) {
  console.log({ error })
  core.setFailed(error.message)
}