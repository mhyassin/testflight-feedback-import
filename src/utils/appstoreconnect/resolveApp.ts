import { appsGetCollection } from 'appstore-connect-sdk';
import type { Client } from 'appstore-connect-sdk';

export const resolveApp = async (
  client: Client,
  bundleId: string,
): Promise<{ id: string; name: string } | null> => {
  const { data, error } = await appsGetCollection({
    client,
    query: {
      'filter[bundleId]': [bundleId],
      'fields[apps]': ['bundleId', 'name'],
    },
  });
  if (error) throw new Error(`ASC apps fetch error: ${JSON.stringify(error)}`);
  const app = data.data.find((a) => a.attributes?.bundleId === bundleId);
  if (!app) return null;
  return {
    id: app.id,
    name: app.attributes?.name ?? bundleId,
  };
};
