#!/usr/bin/env bash
set -euo pipefail

# Install the portable Pi tool set on a machine.
#
#   ./install.sh                 # core package + third-party npm packages
#   ./install.sh --homelab       # also install the homelab-docker extension
#   ./install.sh --no-npm        # core package only
#
# Core package source can be overridden with PI_TOOLS_SOURCE.
# Optional extras need the repository checkout (this script's directory) or
# are cloned into a temporary directory when --homelab is used from elsewhere.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE="${PI_TOOLS_SOURCE:-git:github.com/azaeldrm/pi-tools}"
WITH_HOMELAB=0
WITH_NPM=1

for arg in "$@"; do
  case "$arg" in
    --homelab) WITH_HOMELAB=1 ;;
    --no-npm) WITH_NPM=0 ;;
    -h|--help)
      sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

command -v pi >/dev/null 2>&1 || {
  echo "pi is not on PATH" >&2
  exit 1
}

echo "Installing core Pi package from ${SOURCE}"
pi install "$SOURCE"

if [[ "$WITH_NPM" == 1 ]]; then
  echo "Installing third-party Pi packages"
  pi install npm:pi-web-access
  pi install npm:pi-background-tasks
  pi install npm:@juicesharp/rpiv-todo
  pi install npm:@juicesharp/rpiv-ask-user-question
  pi install npm:pi-compact-tools
fi

if [[ "$WITH_HOMELAB" == 1 ]]; then
  echo "Installing homelab-docker extension"
  AGENT_DIR="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}"
  mkdir -p "$AGENT_DIR/extensions"
  rm -rf "$AGENT_DIR/extensions/homelab-docker"
  cp -R "$ROOT/extras/homelab-docker" "$AGENT_DIR/extensions/homelab-docker"
  echo "Installed into $AGENT_DIR/extensions/homelab-docker"
fi

echo
echo "Done. Restart Pi or run /reload in an active session."
echo "Check installed packages with: pi list"
