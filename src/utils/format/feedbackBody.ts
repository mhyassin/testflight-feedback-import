import {
  BetaFeedbackCrashSubmission,
  BetaFeedbackScreenshotSubmission,
} from 'appstore-connect-sdk';

type Params =
  | { type: 'feedback'; attrs: BetaFeedbackScreenshotSubmission['attributes'] }
  | { type: 'crash'; attrs: BetaFeedbackCrashSubmission['attributes'] };

export const feedbackBody = (
  { type, attrs }: Params,
  id: string,
  appName: string,
  testerName: string,
  buildVersion: string,
): string => {
  const date = attrs?.createdDate ? new Date(attrs.createdDate).toUTCString() : 'Unknown date';
  const commentText = attrs?.comment?.trim() || '_No comment provided_';
  const heading = type === 'crash' ? 'TestFlight Crash Report' : 'TestFlight Feedback';

  const skip = new Set(['createdDate', 'comment']);
  const detailRows: [string, string][] = Object.entries(attrs ?? {})
    .filter(([k, v]) => !skip.has(k) && typeof v === 'string' && v.length > 0)
    .map(([k, v]) => [
      k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase()),
      v as string,
    ]);

  const detailSection =
    detailRows.length > 0
      ? ['', '### Details', '', ...detailRows.map(([k, v]) => `**${k}:** ${v}`)]
      : [];

  const screenshotsSection =
    type === 'feedback'
      ? (attrs?.screenshots ?? [])
          .map((s) => s.url)
          .filter((u) => u !== undefined)
          .map((url, i) => `![Screenshot ${i + 1}](${url})`)
      : [];

  const screenshotsBlock = screenshotsSection.length
    ? ['', '### Screenshots', '', ...screenshotsSection]
    : [];

  return [
    `## ${heading}`,
    '',
    `**App:** ${appName}`,
    `**Tester:** ${testerName}`,
    `**Build:** ${buildVersion}`,
    `**Submitted:** ${date}`,
    ...detailSection,
    '',
    '---',
    '',
    '### Comment',
    '',
    commentText,
    ...screenshotsBlock,
    '',
    '---',
    '',
    `<!-- testflight-id:${id} -->`,
    `<!-- testflight-type:${type} -->`,
  ].join('\n');
};
