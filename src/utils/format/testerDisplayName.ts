import type { BetaTester } from 'appstore-connect-sdk';

export const testerDisplayName = (tester: BetaTester | undefined): string => {
  if (!tester) return 'Unknown tester';
  const { firstName, lastName, email } = tester.attributes ?? {};
  return [firstName, lastName].filter(Boolean).join(' ') || email || 'Unknown tester';
};
