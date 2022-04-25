import * as github from "@actions/github";

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

export { PR_TYPES };
export type {Repository, Commit, Commits, SplitCommits, OctokitClient}