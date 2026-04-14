import * as core from '@actions/core';
import { appsBetaFeedbackCrashSubmissionsGetToManyRelated } from 'appstore-connect-sdk';
import { fetchVersionStrings } from './utils/appstoreconnect';
import { issueExistsForFeedback } from './utils/github';
import { feedbackBody, buildIncludedMap, testerDisplayName, buildVersion } from './utils/format';
import type { ImportParams } from './types';

export const importCrashes = async ({
  client,
  octokit,
  owner,
  repo,
  appId,
  appName,
  labels,
  cutoff,
  dryRun,
}: ImportParams): Promise<{ created: number; skipped: number }> => {
  let created = 0;
  let skipped = 0;

  core.startGroup('Fetching crash reports');
  const { data, error } = await appsBetaFeedbackCrashSubmissionsGetToManyRelated({
    client,
    path: { id: appId },
    query: {
      include: ['tester', 'build'],
      'fields[betaTesters]': ['firstName', 'lastName', 'email'],
      'fields[builds]': ['version'],
      limit: 200,
    },
  });
  if (error) throw new Error(`ASC crash fetch error: ${JSON.stringify(error)}`);
  core.info(`Found ${data.data.length} crash report(s)`);

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

    const title = `[testflight] crash on ${appName} build ${version}`;
    const body = feedbackBody('crash', item.id, appName, testerName, version, attrs);

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
