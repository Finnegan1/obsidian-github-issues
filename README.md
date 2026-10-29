# GitHub & GitLab Issues for Obsidian

![GitHub Release](https://img.shields.io/github/v/release/Finnegan1/obsidian-github-issues)
![GitHub License](https://img.shields.io/github/license/Finnegan1/obsidian-github-issues)
![GitHub Last Commit](https://img.shields.io/github/last-commit/Finnegan1/obsidian-github-issues)
![Release Workflow](https://img.shields.io/github/actions/workflow/status/Finnegan1/obsidian-github-issues/release.yml?label=release)
![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22github-issues%22%5D.downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json)
![GitHub Stars](https://img.shields.io/github/stars/Finnegan1/obsidian-github-issues)
![GitHub Issues](https://img.shields.io/github/issues/Finnegan1/obsidian-github-issues)

An Obsidian plugin that integrates with GitHub, GitHub Enterprise Server and GitLab to track issues and pull requests directly in your vault.

This is the **Enterprise-enabled fork maintained by Finnegan1**. Install **`Finnegan1/obsidian-github-issues`** via BRAT to get this version, not the upstream community plugin. Based on [LonoxX's original plugin](https://github.com/LonoxX/obsidian-github-issues).

> The configurations are heavily inspired by https://github.com/schaier-io, including some specific settings. However, I had already started working on my prototype before I discovered the plugin, and had initially even given it a similar name.

# Documentation

Installation and Enterprise configuration for this fork are documented below. The [upstream wiki](https://github.com/LonoxX/obsidian-github-issues/wiki) covers the remaining features; its installation instructions refer to the original plugin.

## Features

### Issue & Pull Request Tracking

- Track issues and pull requests from multiple GitHub and GitLab repositories
- Automatically sync data on startup (configurable)
- Background sync at configurable intervals
- Filter by labels, assignees, and reviewers
- Include or exclude closed issues/PRs
- Automatic cleanup of old closed items

### GitHub Enterprise Server Support

- Configure your own GitHub instance in the existing GitHub provider
- REST API for repositories, issues, pull requests, comments and sub-issues
- Enterprise GraphQL endpoint for GitHub Projects v2
- Leave the Base URL empty to keep using GitHub.com

### GitLab Support

- Full support for GitLab Issues and Merge Requests
- Works with self-hosted GitLab instances
- Multiple GitLab instances can be configured simultaneously

### GitHub Projects v2 Integration

- Track GitHub Projects across repositories
- Kanban board view for project visualization
- Custom field support (status, priority, iteration)
- Project-specific filtering and organization

### Sub-Issues Support

- Track sub-issues for both GitHub and GitLab (parent/child relationships)
- Display sub-issues list with status indicators
- Navigate between parent and child issues
- Progress tracking with completion percentage

### Settings Profiles

- Central configuration for folders, templates, sync behaviour, and filters
- Assign one profile to multiple repositories instead of configuring each one individually

### Markdown Notes

- Create markdown notes for each issue or PR
- Customizable filename templates with variables
- Custom content templates
- YAML frontmatter with metadata
- Preserve user content with persist blocks
- Include comments in notes

## Installation

### Via BRAT (recommended for this fork)

Requires **Obsidian 1.11.4 or newer** and access to GitHub.com to download the plugin. Access to your Enterprise instance is only required when syncing.

1. Open **Settings → Community plugins**, enable community plugins if needed, then **Browse**.
2. Search for **BRAT** (by TfTHacker), install it and enable it.
3. Open **Settings → BRAT** and choose **Add Beta plugin** (or run **BRAT: Plugins: Add a beta plugin for testing (with or without version)** from the command palette; older BRAT versions omit “Plugins:”).
4. Enter **`Finnegan1/obsidian-github-issues`** (the full GitHub URL also works), select the latest release and click **Add Plugin**. Enable the plugin automatically if that option is shown.
5. In **Settings → Community plugins**, enable **Github Issues** if it is not already enabled.
6. Open **Settings → Github Issues → Providers**, expand the GitHub card and configure the Base URL and token as described below.

BRAT installs the release's `main.js`, `manifest.json` and `styles.css` and can keep this fork updated. Enable BRAT's automatic update check, or use **BRAT: Plugins: Check for updates to all beta plugins and UPDATE**. You do **not** need Node.js, npm, Git or a GitHub.com token to install this public fork.

**Already using the upstream plugin?** Both versions use the plugin ID `github-issues` and cannot run side by side. Back up your vault and `.obsidian/plugins/github-issues/data.json`, disable the existing plugin, then add this fork in BRAT. If BRAT asks to replace the installed plugin, confirm. Existing profiles, repositories and settings are kept; the new Base URL defaults to GitHub.com. Do not uninstall the old plugin first, because that can remove its saved configuration. If BRAT already tracks the upstream repository, remove that repository from BRAT's tracking list without deleting the installed plugin, then add this fork.

The Community Plugins browser installs the **upstream version**, not this fork. For BRAT details, see the [BRAT documentation](https://tfthacker.com/BRAT).

### Manual installation

1. Download **`main.js`**, **`manifest.json`** and **`styles.css`** from the [latest release of this fork](https://github.com/Finnegan1/obsidian-github-issues/releases/latest). GitHub's source-code ZIP is **not** the installable plugin.
2. Create `<vault>/.obsidian/plugins/github-issues/` and place all three files directly in that folder.
3. Reload Obsidian, then enable **Github Issues** under **Settings → Community plugins**.
4. Configure your provider as described below. Manual installations need manual updates.

## Configuration

### GitHub

1. Leave **Settings → Github Issues → Providers → GitHub → Base URL** empty (or enter `https://github.com`), then click **Apply** if you changed it.
2. Create a token at [GitHub → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens), using the permissions below.
3. Enter it in the GitHub card's token field, or enable **Use SecretStorage** and select a token secret.

### GitHub Enterprise Server

1. Connect to your company network/VPN if required. Obsidian must be able to reach the instance over HTTPS; corporate certificates must be trusted by the operating system. The plugin does not bypass TLS verification.
2. Open **Settings → Github Issues → Providers**, enable GitHub if necessary, then click the GitHub card to expand it.
3. Set **Base URL** to your instance URL, for example **`https://github.company.com`**, then click **Apply**. **`https://github.company.com/api/v3`** also works; trailing slashes are removed. Do not enter a repository URL or the GraphQL URL. Apply saves the completed URL before validating the token, so typing does not send it to a partially entered hostname.
4. Create a personal access token **on that Enterprise instance**, usually at `https://github.company.com/settings/tokens`. A GitHub.com token cannot authenticate against a separate Enterprise Server instance. If your organisation requires SSO approval or token authorisation, complete it first.
5. Paste the token into the GitHub card, or use **Use SecretStorage** to store it in Obsidian's keychain. Without SecretStorage, the token is stored in the plugin's `data.json`; do not share or commit that file.
6. Optionally set **Display name** to identify your instance. Check that the token badge reports **Valid token**.
7. Add repositories as **`owner/repository`**, not as full URLs. Use the GitHub provider in the repository selector, or load repositories with the repository browser. Assign a profile and run the plugin's sync command to create notes.

The Base URL applies to the GitHub provider's repositories and projects. REST requests go to `https://github.company.com/api/v3`; GraphQL requests go to `https://github.company.com/api/graphql`. Changing it switches that provider from GitHub.com to Enterprise; already configured repository names are then looked up on the new instance. GitLab instances are unaffected. GitHub Enterprise Cloud on `github.com` uses the normal GitHub.com settings above.

#### Token permissions (GitHub.com and Enterprise)

- **Fine-grained token**, if supported by your server: select the repositories you want to track and grant **Issues: Read-only**, **Pull requests: Read-only** and **Metadata: Read-only**. For organisation Projects v2, also grant **Projects: Read-only** for the organisation, if available.
- **Classic token**: use **`repo`** for private repositories (or **`public_repo`** for public-only access) and **`read:org`** for the organisation/repository browser. Add **`read:project`** if you want to sync Projects v2; no project-write scope is needed.
- Token permissions never replace your account's repository access. Enterprise policies may require an administrator's approval or restrict token types.

Projects v2 and sub-issues require an Enterprise Server version that provides those APIs and enabled features. An older server may support issue/PR syncing without Projects v2 or sub-issues. Leave those options disabled if the server does not support them.

#### Troubleshooting

- **401 / invalid token**: create the token on the configured instance and check expiration and token permissions.
- **403 / 404**: check repository spelling/access, organisation token approval and SSO requirements. GitHub may return 404 for repositories you cannot access.
- **Network / certificate error**: check VPN, DNS and system trust for your corporate CA. Do not disable certificate verification.
- **BRAT cannot find a release**: use `Finnegan1/obsidian-github-issues`, not your Enterprise repository URL. The plugin is downloaded from this public fork; only its issue/PR data comes from Enterprise.

### GitLab

1. Create a GitLab Personal Access Token with `read_api` scope
   → GitLab → Preferences → Access Tokens
2. Enable the GitLab provider in **Settings - Providers - GitLab Token** and paste your token

## Adding Repositories

1. Open the plugin settings in Obsidian
2. Add repositories by entering the repository path (e.g., `team/service`),
   or use the repository browser to select one or multiple repositories
3. Click **Add Repository** or **Add Selected Repositories**
4. The plugin will automatically fetch issues from the configured repositories

## Releases and development (maintainers)

The default branch of this fork is `master`. Release tags are plain semantic versions without a `v` prefix, matching `manifest.json` and `package.json`.

```sh
npm ci
npm test
npm run build
```

To publish an update, run `npm version minor --no-git-tag-version` (or `patch`), which updates `package.json`, `package-lock.json`, `manifest.json` and `versions.json`. Commit those files with the implementation, push to this fork, then create and push the matching tag (for example `1.10.0`). The Release workflow tests and builds the plugin and uploads **`main.js`**, **`manifest.json`** and **`styles.css`** as individual GitHub Release assets for BRAT. It does not push automatic version commits. For a first release or repair, the workflow can also be run manually from the Actions tab.

### 1.10.0

- GitHub Enterprise Server Base URL for REST and GraphQL, with GitHub.com remaining the default.
- Enterprise provider labels and token/configuration guidance in settings.
- BRAT-compatible releases from this fork and documented installation/update steps.
- Regression coverage for Enterprise endpoint selection and client reset after configuration changes.

## Support

If you find this plugin useful and would like to support its development, you can star the repository or support me on Ko-fi or [GitHub Sponsors](https://github.com/sponsors/LonoxX):

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/LonoxX)
