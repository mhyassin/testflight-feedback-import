import * as core from '@actions/core';
import * as github from '@actions/github';
import { createClient } from 'appstore-connect-sdk';
import { resolveApp } from './utils/appstoreconnect';
import { ensureLabelExists } from './utils/github';
import { importFeedback } from './importFeedback';
import { importCrashes } from './importCrashes';

const run = async (): Promise<void> => {
  const ascIssuerId = core.getInput('asc_issuer_id', { required: true });
  const ascKeyId = core.getInput('asc_key_id', { required: true });
  // Secrets stored with literal \n need to be unescaped
  const ascPrivateKey = core.getInput('asc_private_key', { required: true }).replace(/\\n/g, '\n');
  const ascBundleId = core.getInput('asc_bundle_id', { required: true });
  const githubToken = core.getInput('github_token', { required: true });
  const dryRun = core.getInput('dry_run') === 'true';
  const shouldImportCrashes = core.getInput('import_crashes') !== 'false';
  const daysBack = parseInt(core.getInput('days_back') || '7', 10);
  const feedbackLabels = (core.getInput('labels_feedback') || 'testflight-feedback')
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);
  const crashLabels = (core.getInput('labels_crashes') || 'crash')
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);

  const client = createClient({
    issuerId: ascIssuerId,
    privateKeyId: ascKeyId,
    privateKey: ascPrivateKey,
  });

  const { owner, repo } = github.context.repo;
  const octokit = github.getOctokit(githubToken);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);

  core.info(`Fetching TestFlight feedback for ${ascBundleId} since ${cutoff.toDateString()}`);
  if (dryRun) core.info('DRY RUN — no issues will be created');

  const app = await resolveApp(client, ascBundleId);
  if (!app) {
    core.setFailed(`No app found for bundle ID: ${ascBundleId}`);
    return;
  }
  core.info(`Resolved app: ${app.name} (${app.id})`);

  if (!dryRun) {
    for (const label of feedbackLabels) {
      await ensureLabelExists(octokit, owner, repo, label);
    }
    if (shouldImportCrashes) {
      for (const label of crashLabels) {
        await ensureLabelExists(octokit, owner, repo, label);
      }
    }
  }

  const baseParams = {
    client,
    octokit,
    owner,
    repo,
    appId: app.id,
    appName: app.name,
    cutoff,
    dryRun,
  };

  const feedbackStats = await importFeedback({
    ...baseParams,
    labels: feedbackLabels,
  });

  const crashStats = shouldImportCrashes
    ? await importCrashes({ ...baseParams, labels: crashLabels })
    : { created: 0, skipped: 0 };

  if (!shouldImportCrashes) core.info('Skipping crash reports (import_crashes is false)');

  const created = feedbackStats.created + crashStats.created;
  const skipped = feedbackStats.skipped + crashStats.skipped;

  core.info(`Done — created: ${created}, skipped: ${skipped}`);
  core.setOutput('created', String(created));
  core.setOutput('skipped', String(skipped));
};

run().catch((err: Error) => core.setFailed(err.message));
