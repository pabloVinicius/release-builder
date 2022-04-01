# Release Builder action

This action setup a release by getting the merge commits, updating the version, updating the changelog file and the PR body.

## Inputs

## `token`

**Required** GitHub token. You can access on the workflow by doing `token: ${{ secrets.GITHUB_TOKEN }}`.

## Outputs

## `changelog`

The new version changelog with merge commits split into Features, Improvements and Fixes.

## Example usage

```
uses: pabloVinicius/release-builder@v0.8
with:
  token: ${{ secrets.GITHUB_TOKEN }}
```