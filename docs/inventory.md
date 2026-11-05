# Inventory from homelab-compute

Captured from `~/.pi/agent` on `homelab-compute` (Pi 1.4.0). The tables map
each installed resource to its origin and whether this repository packages it.

## Package declarations

| Source in settings | Type | Packaged here? | Notes |
|---|---|---|---|
| `npm:pi-web-access` | npm Pi package | No | Third-party; installed by `install.sh`. |
| `npm:pi-background-tasks` | npm Pi package | No | Third-party; installed by `install.sh`. |
| `npm:@juicesharp/rpiv-todo` | npm Pi package | No | Third-party; installed by `install.sh`. |
| `npm:@juicesharp/rpiv-ask-user-question` | npm Pi package | No | Third-party; installed by `install.sh`. |
| `npm:pi-compact-tools` | npm Pi package | No | Third-party; installed by `install.sh`. |
| `~/.pi/agent/local-packages/powerline-footer` | local fork | Yes, vendored | Copied into `vendor/powerline-footer`, custom changes retained. |
| `~/.pi/agent/local-packages/github-pr` | local fork | Yes, vendored | Copied into `vendor/pi-github-pr`, custom changes retained. |

## Extensions and extension directories

| Path under `~/.pi/agent/extensions/` | Role | Packaged here? |
|---|---|---|
| `context-meter.ts` | Context/model/thinking status meter | Yes |
| `harness-context.ts` | Writes herdr harness context JSON | Yes |
| `herdr-agent-state.ts` | Herdr-managed pane/agent state | No; herdr owns this file |
| `homelab-docker/` | `/homelab` command, dashboard, Docker tool | Optional `extras/homelab-docker/` |
| `inline-bash.ts` | `!{command}` prompt expansion | Yes |
| `local-hardware.ts` | CPU/GPU status for `llama.cpp` | Yes |
| `permission-gate.ts` | Dangerous-command confirmation | Yes |
| `powerline-footer/theme.json` | Footer theme config | Yes, bundled with vendored footer |
| `procession-banner/` | Top banner/start panel | Yes |
| `protected-paths.ts` | Write/edit path protection | Yes |
| `subagent/` | Subagent tool and agent discovery | Yes |
| `working-indicator.ts` | Custom streaming indicator | Yes |

## Themes, prompts, agents

| Path | Packaged here? |
|---|---|
| `themes/azael.json` | Yes, `themes/azael.json` |
| `themes/procession.json` | Yes, `themes/procession.json` |
| `prompts/implement.md` | Yes |
| `prompts/implement-and-review.md` | Yes |
| `prompts/scout-and-plan.md` | Yes |
| `agents/planner.md` | Yes, bundled under `extensions/subagent/agents/` |
| `agents/scout.md` | Yes, bundled under `extensions/subagent/agents/` |
| `agents/worker.md` | Yes, bundled under `extensions/subagent/agents/` |
| `agents/reviewer.md` | Yes, bundled under `extensions/subagent/agents/` |

## Not part of the portable tool set

- `~/.pi/agent/settings.json`, `auth.json`, `models.json`, `models-store.json`,
  sessions, and `trust.json` are machine/session state, not tools. They stay
  machine-local.
- `herdr-agent-state.ts` is installed and overwritten by the herdr integration.
- The `homelab-docker` extension is left optional because it needs a Docker
  homelab checkout with `manage-container.sh`.
- Omarchy skill symlinks on the local workstation point at
  `/usr/share/omarchy/default/agents/skills`; these are OS-packaged skills, not
  part of Pi tools installed on homelab-compute.
