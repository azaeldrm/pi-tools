# Local changes

Based on `@narumitw/pi-github-pr` 0.49.8. Loaded from this directory via `settings.json` so npm updates cannot overwrite the display customization.

- Open pull requests show a muted Nerd Font pull-request icon followed by the linked `#number`, styled with the active theme's accent color, bold, and underline. OSC 8 links are emitted unconditionally using the standard ST terminator, rather than relying on Pi's conservative capability detection.
- Closed or merged pull requests clear the status instead of remaining visible.
- Updated both `src/github-pr.ts` and the bundled runtime in `dist/index.ts`; Pi loads the bundled runtime.

To revert, point `settings.json` back to `npm:@narumitw/pi-github-pr`.
