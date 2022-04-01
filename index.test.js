// const { Octokit } = require("@octokit/rest");

// (async () => {
//   const octokit = new Octokit({
//     auth: `token ${process.env.GITHUB_TOKEN}`
//   })

//   const repo = {
//     owner: "pabloVinicius",
//     repo: "react-github-repositories"
//   }

//   const commits = await getCommits(octokit, repo);
//   const splitCommits = splitCommitsByType(commits);
//   const newVersionChangelog = createChangelogContent(splitCommits, "1.2.0", "https://github.com/pabloVinicius/react-github-repositories")

//   writeChangelogFile(newVersionChangelog, "changelog.md");

// })()