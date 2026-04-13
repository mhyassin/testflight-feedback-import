import * as core from '@actions/core';
import * as github from '@actions/github';
import { appsBetaFeedbackScreenshotSubmissionsGetToManyRelated } from 'appstore-connect-sdk';
import type { Client } from 'appstore-connect-sdk';
import { fetchVersionStrings, downloadImage } from './utils/appstoreconnect';
import { issueExistsForFeedback, uploadImageToGitHub } from './utils/github';
import { feedbackBody, buildIncludedMap, testerDisplayName, buildVersion } from './utils/format';

type Octokit = ReturnType<typeof github.getOctokit>;

interface ImportFeedbackParams {
  client: Client;
  octokit: Octokit;
  owner: string;
  repo: string;
  appId: string;
  appName: string;
  githubToken: string;
  labels: string[];
  cutoff: Date;
  dryRun: boolean;
}

export const importFeedback = async ({
  client,
  octokit,
  owner,
  repo,
  appId,
  appName,
  githubToken,
  labels,
  cutoff,
  dryRun,
}: ImportFeedbackParams): Promise<{ created: number; skipped: number }> => {
  let created = 0;
  let skipped = 0;

  core.startGroup('Fetching screenshot/text feedback');
  const { data, error } = await appsBetaFeedbackScreenshotSubmissionsGetToManyRelated({
    client,
    path: { id: appId },
    query: {
      include: ['tester', 'build'],
      'fields[betaTesters]': ['firstName', 'lastName', 'email'],
      'fields[builds]': ['version'],
      limit: 200,
    },
  });
  if (error) throw new Error(`ASC feedback fetch error: ${JSON.stringify(error)}`);
  core.info(`Found ${data.data.length} screenshot feedback item(s)`);

  const metaMap = buildIncludedMap(data.included ?? []);
  const buildIds = [
    ...new Set((data.included ?? []).filter((r) => r.type === 'builds').map((r) => r.id)),
  ];
  const versionStrings = await fetchVersionStrings(client, buildIds);

  for (const item of data.data) {
    const attrs = item.attributes ?? {};
    if (!attrs.createdDate || new Date(attrs.createdDate) < cutoff) continue;

    if (await issueExistsForFeedback(octokit, owner, repo, labels[0], item.id)) {
      core.info(`  skip (exists): ${item.id}`);
      skipped++;
      continue;
    }

    const testerEntry = metaMap.get(item.relationships?.tester?.data?.id ?? '');
    const tester = testerEntry?.type === 'betaTesters' ? testerEntry : undefined;
    const buildEntry = metaMap.get(item.relationships?.build?.data?.id ?? '');
    const build = buildEntry?.type === 'builds' ? buildEntry : undefined;
    const testerName = testerDisplayName(tester);
    const version = buildVersion(build, versionStrings.get(build?.id ?? ''));

    const screenshotUrls: string[] = [];
    if (!dryRun) {
      for (let i = 0; i < (attrs.screenshots ?? []).length; i++) {
        const url = attrs.screenshots?.[i].url;
        if (!url) continue;
        try {
          const image = await downloadImage(url);
          const uploaded = await uploadImageToGitHub(githubToken, owner, repo, image);
          screenshotUrls.push(uploaded);
        } catch (err) {
          core.warning(`Failed to upload screenshot ${i + 1} for ${item.id}: ${err}`);
        }
      }
    }

    const title = `[testflight] feedback on ${appName} build ${version}`;
    const body = feedbackBody(
      'feedback',
      item.id,
      appName,
      testerName,
      version,
      attrs,
      screenshotUrls,
    );

    if (dryRun) {
      core.info(`  [DRY RUN] would create: ${title} id: ${item.id}`);
    } else {
      await octokit.rest.issues.create({ owner, repo, title, body, labels });
      core.info(`  created: ${title}`);
    }
    created++;
  }
  core.endGroup();

  return { created, skipped };
};
