import { buildsGetCollection } from 'appstore-connect-sdk';
import type { Client } from 'appstore-connect-sdk';

export const fetchVersionStrings = async (
  client: Client,
  buildIds: string[],
): Promise<Map<string, string>> => {
  if (!buildIds.length) return new Map();
  const { data, error } = await buildsGetCollection({
    client,
    query: {
      'filter[id]': buildIds,
      include: ['preReleaseVersion'],
      'fields[preReleaseVersions]': ['version'],
    },
  });
  if (error) throw new Error(`ASC builds fetch error: ${JSON.stringify(error)}`);
  const included = new Map((data.included ?? []).map((r) => [r.id, r]));
  const map = new Map<string, string>();
  for (const build of data.data) {
    const preReleaseId = build.relationships?.preReleaseVersion?.data?.id;
    const preRelease = preReleaseId ? included.get(preReleaseId) : undefined;
    if (preRelease?.type === 'preReleaseVersions') {
      const version = preRelease.attributes?.version;
      if (version) map.set(build.id, version);
    }
  }
  return map;
};
