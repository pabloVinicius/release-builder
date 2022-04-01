const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require("@octokit/rest");
const exec = require('child_process').exec;

const PR_TYPES = {
  fix: "FIX",
  feat: "FEATURE",
  feature: "FEATURE",
  improve: "IMPROVEMENT",
}

const updateVersion = (version) => {
  //  https://github.com/Reedyuk/NPM-Version/blob/master/index.js
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

const main  = () => {
  const { ref, repo } = github.context;
  const releaseNumber = ref.split('/').slice(-1)[0];

  updateVersion(releaseNumber);

  const token = core.getInput("token");
  const octokit = github.getOctokit(token);

  getCommits(octokit.rest, repo);
  
}


try {
  // main()

  (async () => {
    const octokit = new Octokit({
      auth: `token ${process.env.TOKEN}`
    })
  
    const repo = {
      owner: "pabloVinicius",
      repo: "react-github-repositories"
    }
  
    const commits = await getCommits(octokit, repo);
  
    console.log({ commits })

  })()
} catch (error) {
  console.log({ error })
  core.setFailed(error.message)
}