import * as core from '@actions/core';
import * as github from '@actions/github';

type Octokit = ReturnType<typeof github.getOctokit>;

export const ensureLabelExists = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  name: string,
): Promise<void> => {
  try {
    await octokit.rest.issues.getLabel({ owner, repo, name });
  } catch {
    await octokit.rest.issues.createLabel({
      owner,
      repo,
      name,
    });
    core.info(`Created label: ${name}`);
  }
};
