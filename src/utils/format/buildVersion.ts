import type { Build } from 'appstore-connect-sdk';

export const buildVersion = (
  build: Build | undefined,
  versionString: string | undefined,
): string => {
  if (!build) return 'Unknown build';
  const buildNumber = build.attributes?.version;
  if (versionString && buildNumber) return `${versionString} (${buildNumber})`;
  return buildNumber ?? versionString ?? 'Unknown build';
};
