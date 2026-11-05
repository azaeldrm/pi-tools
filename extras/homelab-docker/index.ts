/**
 * homelab-docker — global Pi extension for the Docker homelab repo.
 *
 * Installs under ~/.pi/agent/extensions/ so /homelab and the `homelab` tool
 * work from any directory; the target repo is resolved by resolveBaseDir()
 * (see tools.ts) rather than taken from the current working directory.
 *
 * Registers a single `homelab` tool (list/status/logs/up/restart/down) that
 * wraps docker + ./manage-container.sh. All logic lives in ./tools.ts.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerHomelabCommand } from "./command.ts";
import { registerHomelabTool } from "./tools.ts";

export default function (pi: ExtensionAPI) {
	registerHomelabTool(pi);
	registerHomelabCommand(pi);
}
