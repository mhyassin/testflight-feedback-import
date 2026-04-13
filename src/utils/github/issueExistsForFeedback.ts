import * as github from '@actions/github';

type Octokit = ReturnType<typeof github.getOctokit>;

export const issueExistsForFeedback = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  label: string,
  feedbackId: string,
): Promise<boolean> => {
  const marker = `testflight-id:${feedbackId}`;
  try {
    for await (const { data } of octokit.paginate.iterator(octokit.rest.issues.listForRepo, {
      owner,
      repo,
      state: 'all',
      labels: label,
      per_page: 100,
    })) {
      if (data.some((issue) => issue.body?.includes(marker))) return true;
    }
    return false;
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 403 || status === 401) {
      throw new Error(
        `GitHub token does not have Issues read permission for ${owner}/${repo}. ` +
          `Fine-grained PATs need "Issues: Read" enabled for this repository.`,
      );
    }
    throw err;
  }
};
