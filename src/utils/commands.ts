import * as core from "@actions/core";
const exec = require("child_process").exec;

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

export { updateProjectVersion }