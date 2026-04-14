import * as github from '@actions/github';
import type { Client } from 'appstore-connect-sdk';

type Octokit = ReturnType<typeof github.getOctokit>;

export interface ImportParams {
  client: Client;
  octokit: Octokit;
  owner: string;
  repo: string;
  appId: string;
  appName: string;
  labels: string[];
  cutoff: Date;
  dryRun: boolean;
}
