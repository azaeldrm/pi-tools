# homelab-docker (global Pi extension)

Adds the `homelab` agent tool and the `/homelab` command (dashboard + direct
`list/status/logs/up/restart/down`) for this server's Docker homelab repo.

Lives in `~/.pi/agent/extensions/` so it loads in **every** project.

## Which repo does it act on?

`resolveBaseDir()` in `tools.ts` resolves the target repo, in order:

| Source   | Rule |
|--------|------|
| `env`    | `$HOMELAB_DOCKER_DIR` — explicit override, always wins |
| `cwd`    | nearest ancestor of the working directory containing `manage-container.sh` (a second checkout or worktree wins while you are inside it) |
| `config` | `{"baseDir": "/srv/homelab/docker"}` in `~/.pi/agent/homelab-docker/config.json` |
| `default` | `/srv/homelab/docker`, when it exists |
| `fallback` | cwd — actions then fail with setup instructions |

Every command runs with `cwd` set to the resolved root and compose files are
passed by absolute path, so behavior is identical from any directory.

## Files

- `tools.ts` — resolution, validation, command construction, execution, rendering
- `command.ts` — `/homelab` parsing, completion, entry renderer
- `dashboard.ts` — interactive service menu + per-machine visibility config
  (`~/.pi/agent/homelab-docker/visibility.json`)

## Safety

`down` is confirmed on each user-facing path: the `homelab` tool's `down`
action is gated by `permission-gate`, and `/homelab down` shows its own
60s-timeout confirmation.

## Repoint it

```bash
# per shell / session
export HOMELAB_DOCKER_DIR=/path/to/other/homelab/docker

# persistent, machine-wide
echo '{"baseDir":"/path/to/other/homelab/docker"}' > ~/.pi/agent/homelab-docker/config.json
```
