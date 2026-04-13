# TestFlight Feedback Import

A GitHub Action that pulls TestFlight tester feedback and crash reports from App Store Connect and creates GitHub Issues for each one.

## How it works

On each run the action:

1. Authenticates with App Store Connect using a JWT signed with your API key.
2. Resolves your app by bundle ID.
3. Fetches screenshot/text feedback (`betaFeedbackScreenshotSubmissions`) and crash reports (`betaFeedbackCrashSubmissions`) submitted within the configured window.
4. For each item, checks whether an issue already exists by paginating issues with the feedback label and looking for a hidden `<!-- testflight-id:… -->` marker in the body.
5. Creates a new issue if none exists, skips it otherwise.

Deduplication is idempotent — running the action multiple times will never produce duplicate issues.

## Usage

```yaml
- uses: mhyassin/testflight-feedback-import@v1
  with:
    asc_issuer_id: ${{ secrets.ASC_ISSUER_ID }}
    asc_key_id: ${{ secrets.ASC_KEY_ID }}
    asc_private_key: ${{ secrets.ASC_PRIVATE_KEY }}
    asc_bundle_id: com.example.app
    github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Full example — scheduled nightly import

```yaml
name: Import TestFlight Feedback

on:
  schedule:
    - cron: '0 6 * * *' # every day at 06:00 UTC
  workflow_dispatch:

jobs:
  import:
    runs-on: ubuntu-latest
    permissions:
      issues: write

    steps:
      - uses: mhyassin/testflight-feedback-import@v1
        with:
          asc_issuer_id: ${{ secrets.ASC_ISSUER_ID }}
          asc_key_id: ${{ secrets.ASC_KEY_ID }}
          asc_private_key: ${{ secrets.ASC_PRIVATE_KEY }}
          asc_bundle_id: com.example.app
          github_token: ${{ secrets.GITHUB_TOKEN }}
          days_back: '7'
          labels_feedback: testflight-feedback
          dry_run: 'false'
```

## Inputs

| Input             | Required | Default               | Description                                                     |
| ----------------- | -------- | --------------------- | --------------------------------------------------------------- |
| `asc_issuer_id`   | Yes      | —                     | App Store Connect API Issuer ID                                 |
| `asc_key_id`      | Yes      | —                     | App Store Connect API Key ID                                    |
| `asc_private_key` | Yes      | —                     | Contents of the `.p8` private key file                          |
| `asc_bundle_id`   | Yes      | —                     | App bundle ID (e.g. `com.example.app`)                          |
| `github_token`    | Yes      | —                     | GitHub token with `issues: read` and `issues: write` permission |
| `days_back`       | No       | `7`                   | How many days back to fetch feedback                            |
| `labels_feedback` | No       | `testflight-feedback` | Comma-separated labels applied to feedback issues               |
| `labels_crashes`  | No       | `crash`               | Comma-separated labels applied to crash report issues           |
| `dry_run`         | No       | `false`               | Log what would be created without creating issues               |
| `import_crashes`  | No       | `true`                | Whether to import crash reports as issues                       |

## Outputs

| Output    | Description                                              |
| --------- | -------------------------------------------------------- |
| `created` | Number of issues created in this run                     |
| `skipped` | Number of items skipped because an issue already existed |

## Setting up App Store Connect API access

1. In [App Store Connect](https://appstoreconnect.apple.com), go to **Users and Access → Integrations → App Store Connect API**.
2. Create a key with the **Developer** role (read access to feedback is sufficient).
3. Download the `.p8` file — you can only download it once.
4. Add the following repository secrets:
   - `ASC_ISSUER_ID` — the Issuer ID shown on the API Keys page
   - `ASC_KEY_ID` — the Key ID of your new key
   - `ASC_PRIVATE_KEY` — the full contents of the `.p8` file (including `-----BEGIN PRIVATE KEY-----` header/footer)
