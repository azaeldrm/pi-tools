# azaeldrm pi-tools

A portable Pi package containing the extensions, prompts, themes, and statusline
customizations I use across machines. Install it from git, no build step needed.

```bash
pi install git:github.com/azaeldrm/pi-tools
```

Then install the third-party packages that this repo does not own:

```bash
pi install npm:pi-web-access
pi install npm:pi-background-tasks
pi install npm:@juicesharp/rpiv-todo
pi install npm:@juicesharp/rpiv-ask-user-question
pi install npm:pi-compact-tools
```

Or run `./install.sh` from a checkout to do the full port: it installs the
package, the third-party npm packages, applies `profiles/ui.json` (theme,
powerline, default thinking level) and merges `profiles/llama-cpp-models.json`
(model display names and thinking-level maps). `./install.sh --homelab` also
copies the optional `homelab-docker` extension into
`~/.pi/agent/extensions/`. Use `--no-ui` or `--no-models` to skip either profile.

After installing, restart Pi or run `/reload`. Verify with `pi list`.

## Porting to a machine

The established process is one install command plus optional cleanup of old
machine-local copies. The package is the source of truth for the shared tools.

### Fresh machine (no old local copies)

```bash
mkdir -p ~/.local/share
git clone https://github.com/azaeldrm/pi-tools.git ~/.local/share/pi-tools
~/.local/share/pi-tools/install.sh
# optional: add the homelab-docker extension
~/.local/share/pi-tools/install.sh --homelab
```

Or, if you only want the core package and already know the npm packages:

```bash
pi install git:github.com/azaeldrm/pi-tools
```

### Machine that already has the old local copies

For example, homelab-compute currently has local extension files and two local
package directories. Review and clean them in two steps:

```bash
cd ~/code/pi-tools
./install.sh --clean-duplicates --dry-run   # review; changes nothing
./install.sh --clean-duplicates             # install + remove identical copies
```

The cleanup removes local copies of extensions, prompts, themes, agents, and
local package directories that are identical to the package. If the dry-run
reports `DIFFERS` for a directory (for example `subagent`), review it and
remove it manually if it is the old pre-package copy:

```bash
rm -rf ~/.pi/agent/extensions/subagent
rm -rf ~/.pi/agent/local-packages/powerline-footer
rm -rf ~/.pi/agent/local-packages/github-pr
pi remove ~/.pi/agent/local-packages/powerline-footer
pi remove ~/.pi/agent/local-packages/github-pr
```

Keep these machine-local extras:

```text
~/.pi/agent/extensions/herdr-agent-state.ts         # herdr installs/manages this
~/.pi/agent/extensions/homelab-docker/              # optional extra, not in the package
```

Run `/reload` or restart Pi. If you want the homelab Docker tool, copy it with
`./install.sh --homelab` instead of removing that directory.

### This workstation

The repo already exists at `~/code/pi-tools`. The short version is:

```bash
cd ~/code/pi-tools && ./install.sh
rm -f ~/.pi/agent/extensions/harness-context.ts   # package owns it now
```

Keep `~/.pi/agent/extensions/herdr-agent-state.ts`; herdr manages it.

## Requirements

- Pi 1.4.0 or newer.
- `ffmpeg` on `PATH` for the Procession startup banner.
- Linux sysfs and, for NVIDIA GPUs, `nvidia-smi` for `local-hardware`.
- `gh` authenticated for the vendored GitHub PR status extension.
- herdr for `harness-context` and the herdr-managed agent-state integration.

## Model display names / llama.cpp profile

`profiles/llama-cpp-models.json` contains the llama.cpp `modelOverrides` used
in the homelab-compute UI, including display names such as `Maya-XS` for
`deepseek-v4.1-flash`. The standard `./install.sh` applies it automatically;
the `--models` flag also applies it explicitly, and `--no-models` skips it.

```bash
./install.sh --dry-run   # preview both profiles and cleanup
```

The merge is additive: it writes into `~/.pi/agent/models.json` and preserves
any existing per-model `maxTokens` override. It never touches
`models-store.json` (the generated provider catalog) or `auth.json`.

## Data and external calls

This repository contains no credentials, API keys, SSH keys, private IPs,
session files, or user files. It also makes no network calls by default. Three bundled features can contact
external services:

| Feature | Default | What leaves the machine |
|---|---|---|
| `vendor/powerline-footer` auto-follow-up | Off (`powerline.autoFollowUp` defaults to `false`) | If enabled **and** `TYPESAFE_API_KEY` is set, it sends the current user prompt, a snippet of the agent's latest reply, and the new message to `api.typesafe.ai` to decide steer-vs-follow-up. This is the only path that sends conversation content externally. |
| `vendor/powerline-footer` currency rates | Background, when cost currency is non-USD | A GET request to jsDelivr for public exchange rates. No local data is sent. |
| `vendor/pi-github-pr` | Background in Git repos | Calls the authenticated `gh` CLI to fetch PR metadata from GitHub. No local files or conversation are sent. |

`extensions/*`, `extras/homelab-docker`, and `extras/herdr-managed` are
local-only: they read local files/status, run local commands, or write local
state. The third-party npm packages installed by `install.sh` are not vendored
here and may have their own network behavior; review them separately.

The docs mention the hostname `homelab-compute` and the optional path
`/srv/homelab/docker`; neither is a secret. Remove them if you prefer to keep
the public repo free of internal naming.

## What this repository packages

Everything below is discovered from the package's `pi` manifest.

| Resource | What it does |
|---|---|
| `extensions/context-meter.ts` | Model/auth/thinking badges and an 18-cell context-usage meter. |
| `extensions/harness-context.ts` | Publishes context usage to `~/.config/harness/context` for herdr harness panes. |
| `extensions/inline-bash.ts` | Expands `!{command}` inline bash in prompts before sending them. |
| `extensions/local-hardware.ts` | CPU/GPU load and temperature status for `llama.cpp` sessions. |
| `extensions/permission-gate.ts` | Confirms dangerous bash, homelab Docker, and forced git operations. |
| `extensions/protected-paths.ts` | Blocks writes through `.git/`/`node_modules/` and confirms env files. |
| `extensions/working-indicator.ts` | `/working-indicator` dot/pulse/none/spinner customization. |
| `extensions/procession-banner/index.ts` | Top banner and startup panel for the Procession theme. |
| `extensions/subagent/index.ts` | Isolated subagent tool (single, parallel, chain). Bundles scout/planner/reviewer/worker agents and discovers package-local agents before `~/.pi/agent/agents/`. |
| `vendor/powerline-footer/` | Locally modified `pi-powerline-footer` 0.19.1 fork: responsive multi-row layout, hardware row, pinned right segments, local-cost tweaks. |
| `vendor/pi-github-pr/` | Locally modified `@narumitw/pi-github-pr` 0.49.8 fork: linked PR number and closed/merged PR handling. |
| `themes/azael.json` | Warm brown/pink theme. |
| `themes/procession.json` | Dark teal/abyss theme for the procession banner. |
| `prompts/implement*.md` | `/implement`, `/implement-and-review`, `/scout-and-plan` subagent workflows. |
| `extensions/subagent/agents/*.md` | Bundled scout, planner, reviewer, and worker agent definitions. |

The subagent extension in this repo adds package-local agent discovery. Agents
in `~/.pi/agent/agents/` still override bundled agents with the same name.

## Optional extras (not loaded by the package)

| Extra | Install | Why it is separate |
|---|---|---|
| `extras/homelab-docker/` | `./install.sh --homelab` (or copy to `~/.pi/agent/extensions/homelab-docker/`) | Needs a Docker homelab checkout (`manage-container.sh`); only useful on the homelab server. |
| `extras/herdr-managed/herdr-agent-state.ts` | Do not install manually | Herdr installs and overwrites this integration itself. Kept here only for reference. |

## Third-party packages

These remain normal npm Pi packages. They are listed in `install.sh` because a
Pi package cannot reliably install another Pi package as a nested dependency.

- `pi-web-access`
- `pi-background-tasks`
- `@juicesharp/rpiv-todo`
- `@juicesharp/rpiv-ask-user-question`
- `pi-compact-tools`

`pi update --extensions` reconciles package updates. If you want a pinned
version, use `pi install npm:@scope/package@1.2.3`.

## Inventory of `homelab-compute`

The node's `~/.pi/agent/settings.json` at the time this repo was built contained:

**Package sources**

- npm: `pi-web-access`
- npm: `pi-background-tasks`
- npm: `@juicesharp/rpiv-todo`
- npm: `@juicesharp/rpiv-ask-user-question`
- npm: `pi-compact-tools`
- local path: `~/.pi/agent/local-packages/powerline-footer`
- local path: `~/.pi/agent/local-packages/github-pr`

**Extensions**

- `context-meter.ts`
- `harness-context.ts`
- `herdr-agent-state.ts` (herdr-managed, not packaged)
- `homelab-docker/` (`index.ts`, `command.ts`, `dashboard.ts`, `tools.ts`)
- `inline-bash.ts`
- `local-hardware.ts`
- `permission-gate.ts`
- `powerline-footer/theme.json` (now bundled in the vendored footer)
- `procession-banner/`
- `protected-paths.ts`
- `subagent/`
- `working-indicator.ts`

**Other resources**

- themes: `azael.json`, `procession.json`
- prompts: `implement.md`, `implement-and-review.md`, `scout-and-plan.md`
- agents: `planner.md`, `scout.md`, `worker.md`, `reviewer.md`

See [`docs/inventory.md`](docs/inventory.md) for the detailed source/status map.

## Powerline settings

The package supplies the extension and themes, but not a machine's
`settings.json`. The homelab-compute powerline configuration is:

```json
{
  "theme": "azael",
  "powerline": {
    "placement": "above",
    "separator": "dot",
    "cost": { "subscriptionDisplay": "reported-cost" },
    "disabledSegments": ["git"],
    "layout": {
      "left": ["custom:model-auth", "custom:thinking-icon", "shell_mode", "path", "cache_read", "cache_write", "cost", "queue"],
      "right": ["custom:context-meter"]
    },
    "customItems": [
      { "id": "model-auth", "statusKey": "model-auth", "position": "left", "selfColorize": true },
      { "id": "thinking-icon", "statusKey": "thinking-icon", "position": "left", "selfColorize": true },
      { "id": "context-meter", "statusKey": "context-meter", "position": "right", "selfColorize": true }
    ]
  }
}
```

## Migrating homelab-compute

Use the cleanup steps under [Porting to a machine](#porting-to-a-machine):
install the package, remove the old local extension copies and local package
directories, keep `herdr-agent-state.ts` and optionally `homelab-docker/`, then
run `/reload`.

## Pinning and updating

```bash
pi install git:github.com/azaeldrm/pi-tools@v0.3.1
pi update --extensions
```

A git ref is pinned when supplied. Without one, `pi update --extensions`
reconciles against the repository's default branch.

## Repository layout

```text
extensions/        Pi extensions and bundled subagent definitions
vendor/            modified upstream Pi packages (MIT, see THIRD-PARTY.md)
extras/            optional machine-specific / herdr-managed extensions
prompts/           Pi prompt templates
themes/            Pi theme JSON
docs/inventory.md  detailed inventory from homelab-compute
install.sh         one-shot installer
```

Original extensions are MIT-licensed. Vendored forks retain their upstream
licenses; see [`THIRD-PARTY.md`](THIRD-PARTY.md).
