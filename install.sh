#!/usr/bin/env bash
set -euo pipefail

# Install the portable Pi tool set on a machine.
#
#   ./install.sh                         # core package + third-party npm packages
#   ./install.sh --homelab               # also install the homelab-docker extension
#   ./install.sh --no-npm                # core package only
#   ./install.sh --clean-duplicates      # remove package-owned local copies after install
#   ./install.sh --clean-duplicates --dry-run
#                                        # show what cleanup would remove; change nothing
#
# Core package source can be overridden with PI_TOOLS_SOURCE.
# Optional extras need the repository checkout (this script's directory).

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE="${PI_TOOLS_SOURCE:-git:github.com/azaeldrm/pi-tools}"
AGENT_DIR="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}"

WITH_HOMELAB=0
WITH_NPM=1
CLEAN_DUPLICATES=0
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --homelab) WITH_HOMELAB=1 ;;
    --no-npm) WITH_NPM=0 ;;
    --clean-duplicates) CLEAN_DUPLICATES=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
      sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

if [[ "$DRY_RUN" == 1 ]]; then
  echo "DRY RUN — no installs or file changes will be made."
  echo
fi

if [[ "$DRY_RUN" == 0 ]]; then
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
    mkdir -p "$AGENT_DIR/extensions"
    rm -rf "$AGENT_DIR/extensions/homelab-docker"
    cp -R "$ROOT/extras/homelab-docker" "$AGENT_DIR/extensions/homelab-docker"
    echo "Installed into $AGENT_DIR/extensions/homelab-docker"
  fi
fi

# ── Cleanup plan / duplicate removal ──────────────────────────────────────

status_for_file() {
  local src="$1" dest="$2"
  if [[ ! -e "$dest" ]]; then printf 'missing'; return 0; fi
  if [[ ! -e "$src" ]]; then printf 'package-source-missing'; return 0; fi
  if cmp -s "$src" "$dest"; then printf 'identical'; else printf 'DIFFERS'; fi
}

status_for_dir() {
  local src="$1" dest="$2"
  if [[ ! -e "$dest" ]]; then printf 'missing'; return 0; fi
  if [[ ! -e "$src" ]]; then printf 'package-source-missing'; return 0; fi
  if diff -rq "$src" "$dest" >/tmp/pi-tools-diff.$$ 2>&1; then
    printf 'identical'
  else
    printf 'DIFFERS'
  fi
}

show_diff() {
  local diff_file="/tmp/pi-tools-diff.$$"
  if [[ -s "$diff_file" ]]; then
    sed 's/^/        /' "$diff_file" | head -20
    rm -f "$diff_file"
  fi
}

clean_file() {
  local label="$1" src="$2" dest="$3"
  local status
  status=$(status_for_file "$src" "$dest")
  if [[ "$status" == missing ]]; then return 0; fi

  printf '  %-58s %s\n' "$label" "$status"
  if [[ "$status" == identical ]]; then
    if [[ "$DRY_RUN" == 1 || "$CLEAN_DUPLICATES" == 0 ]]; then
      echo '        -> would remove'
    else
      rm -f -- "$dest"
      echo '        -> removed'
    fi
  else
    echo '        -> skipped (review; local copy differs from package)'
    if [[ "$status" == DIFFERS ]]; then show_diff; fi
  fi
}

clean_dir() {
  local label="$1" src="$2" dest="$3"
  local status
  status=$(status_for_dir "$src" "$dest")
  if [[ "$status" == missing ]]; then return 0; fi

  printf '  %-58s %s/\n' "$label" "$status"
  if [[ "$status" == identical ]]; then
    if [[ "$DRY_RUN" == 1 || "$CLEAN_DUPLICATES" == 0 ]]; then
      echo '        -> would remove directory'
    else
      rm -rf -- "$dest"
      echo '        -> removed directory'
    fi
  else
    echo '        -> skipped (review; local directory differs from package)'
    show_diff
  fi
}

if [[ "$CLEAN_DUPLICATES" == 1 || "$DRY_RUN" == 1 ]]; then
  echo
  echo "Package-owned local extensions under ${AGENT_DIR}/extensions:"

  clean_file "context-meter.ts"       "$ROOT/extensions/context-meter.ts"       "$AGENT_DIR/extensions/context-meter.ts"
  clean_file "harness-context.ts"     "$ROOT/extensions/harness-context.ts"     "$AGENT_DIR/extensions/harness-context.ts"
  clean_file "inline-bash.ts"         "$ROOT/extensions/inline-bash.ts"         "$AGENT_DIR/extensions/inline-bash.ts"
  clean_file "local-hardware.ts"      "$ROOT/extensions/local-hardware.ts"      "$AGENT_DIR/extensions/local-hardware.ts"
  clean_file "permission-gate.ts"     "$ROOT/extensions/permission-gate.ts"     "$AGENT_DIR/extensions/permission-gate.ts"
  clean_file "protected-paths.ts"     "$ROOT/extensions/protected-paths.ts"     "$AGENT_DIR/extensions/protected-paths.ts"
  clean_file "working-indicator.ts"   "$ROOT/extensions/working-indicator.ts"   "$AGENT_DIR/extensions/working-indicator.ts"
  clean_file "powerline-footer/theme.json" "$ROOT/vendor/powerline-footer/theme.json" "$AGENT_DIR/extensions/powerline-footer/theme.json"
  clean_dir  "procession-banner"      "$ROOT/extensions/procession-banner"      "$AGENT_DIR/extensions/procession-banner"
  clean_dir  "subagent"               "$ROOT/extensions/subagent"               "$AGENT_DIR/extensions/subagent"

  echo
  echo "Legacy local package directories under ${AGENT_DIR}/local-packages:"
  for pkg in powerline-footer github-pr; do
    dest="$AGENT_DIR/local-packages/$pkg"
    src="$ROOT/vendor/$pkg"
    if [[ "$pkg" == "github-pr" ]]; then src="$ROOT/vendor/pi-github-pr"; fi

    if [[ -e "$dest" ]]; then
      status=$(status_for_dir "$src" "$dest")
      printf '  %-58s %s/\n' "local-packages/$pkg" "$status"
      if [[ "$status" == identical ]]; then
        if [[ "$DRY_RUN" == 1 || "$CLEAN_DUPLICATES" == 0 ]]; then
          echo '        -> would remove settings entry + directory'
        else
          pi remove "$dest" >/dev/null 2>&1 || true
          rm -rf -- "$dest"
          echo '        -> removed settings entry + directory'
        fi
      else
        echo '        -> skipped directory removal (review); settings entry left intact'
        show_diff
      fi
    else
      printf '  %-58s missing (nothing to remove)\n' "local-packages/$pkg"
    fi
  done

  echo
  echo "Kept machine-local extras:"
  if [[ -e "$AGENT_DIR/extensions/herdr-agent-state.ts" ]]; then
    echo "  ~/.pi/agent/extensions/herdr-agent-state.ts (herdr-managed)"
  fi
  if [[ -d "$AGENT_DIR/extensions/homelab-docker" ]]; then
    echo "  ~/.pi/agent/extensions/homelab-docker/ (optional extra)"
  fi
  echo
  if [[ "$DRY_RUN" == 1 ]]; then
    echo "No changes made."
  fi
fi

if [[ "$DRY_RUN" == 0 ]]; then
  echo
  echo "Done. Restart Pi or run /reload in an active session."
  echo "Check installed packages with: pi list"
fi
