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
  if (!data.data.length) return null;
  return {
    id: data.data[0].id,
    name: data.data[0].attributes?.name ?? bundleId,
  };
};
