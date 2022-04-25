import { execSync } from "child_process";

const updateProjectVersion = (version: string) => {
  execSync(`npm version ${version}`);
};

export { updateProjectVersion }