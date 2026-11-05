# Local Powerline customizations

Based on pi-powerline-footer 0.19.1. Settings load this directory instead of the managed npm package, so automatic updates do not overwrite these changes.

## Files added
- `distributed-layout.ts` (58 lines) — replaces upstream's two-row layout: details pack top-left and wrap in order across as many rows as needed; un-pinned context segments always start the bottom row. Segments listed in `layout.right` are pinned to the right edge of the first (top) row instead, falling back to a following row when they do not fit.
- `hardware-row.ts` (44 lines) — renders CPU/GPU load bars and temperatures from the local-hardware extension's JSON status, and merges them onto the context row's right side when they fit, otherwise below it. All bottom rows keep one-column left/right padding.

## Changes to existing files
- `index.ts` — calls responsiveToolbar; splits multi-row secondary content; passes `layout.right` segments to responsiveToolbar for top-right pinning; restores the latest user prompt from the active session branch after reload; renders its preview above the primary toolbar with an `↱` prefix instead of a below-editor widget; after a successful TODO tool call, re-registers the above-editor status and top widgets once at turn end so the lazy TODO panel appears first; excludes `local-hardware` and the editor-stash indicator (`stash`) from generic extension statuses; does not install the below-editor queue preview (queue counts remain in the primary row's `queue` segment); adds hardware rows to the footer.
- `separators.ts` — `dot` separator renders `•`.
- `segments.ts` — subscription cost mode shows reported cost only (no redundant `(sub)` fallback); USD formatting is two decimals and uses the configured cost icon instead of `$`; hides the cost segment for `llama.cpp` models.

Everything else is unchanged from upstream.

## Reverting
- Restore upstream rendering: set the package source in `~/.pi/agent/settings.json` back to `npm:pi-powerline-footer`.
- Remove hardware rows: disable `~/.pi/agent/extensions/local-hardware.ts`.
- Note: upstream's `right` layout means ordering, not right-edge alignment, so reverting also loses the pinned context/hardware placement.

## Verification
Layout and hardware composition tested at widths 30–160: no segment or device group is dropped, rows never exceed the terminal width, and padding is consistent. Syntax checks pass. Visual confirmation requires `/reload`.
