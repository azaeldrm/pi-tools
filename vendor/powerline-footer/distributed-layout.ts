import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

export interface LayoutPart { id: string; content: string }

const contextIds = new Set(["custom:context-meter", "context_pct", "context_total"]);

/**
 * Pack details top-left, wrapping in order; un-pinned context always starts the
 * bottom row. Parts whose id is listed in `rightIds` are pinned to the right
 * edge of the first (top) row instead — their context ids are not forced to the
 * bottom row. Right content that does not fit on the first row falls back to a
 * following row.
 */
export function responsiveToolbar(
  parts: LayoutPart[],
  width: number,
  separator: string,
  rightIds?: ReadonlySet<string>,
) {
  const inner = Math.max(0, width - 2);
  const padded = (s: string) => truncateToWidth(` ${s} `, width);
  const pinned = rightIds ?? new Set<string>();
  const visible = parts.filter(p => p.content && visibleWidth(p.content));
  const isBottomContext = (id: string) => contextIds.has(id) && !pinned.has(id);
  const context = visible.filter(p => isBottomContext(p.id)).map(p => p.content).join(separator);
  const rightParts = visible.filter(p => pinned.has(p.id)).map(p => p.content);
  const rightContent = rightParts.length > 0
    ? truncateToWidth(rightParts.join(separator), inner, "…")
    : "";

  const rows: string[] = [];
  let current = "";
  for (const part of visible.filter(p => !isBottomContext(p.id) && !pinned.has(p.id))) {
    const content = truncateToWidth(part.content, inner, "…");
    const candidate = current ? `${current}${separator}${content}` : content;
    if (current && visibleWidth(candidate) > inner) {
      rows.push(current);
      current = content;
    } else current = candidate;
  }
  if (current) rows.push(current);

  // Pin right-side content to the right edge of the first (top) row.
  if (rightContent) {
    if (rows.length === 0) {
      rows.push(rightContent);
    } else {
      const gap = inner - visibleWidth(rows[0]) - visibleWidth(rightContent);
      if (gap >= 1) rows[0] = `${rows[0]}${" ".repeat(gap)}${rightContent}`;
      else rows.push(rightContent);
    }
  }

  if (context) rows.push(context);

  const [top = "", ...rest] = rows;
  return { topContent: top ? padded(top) : "", secondaryContent: rest.map(padded).join("\n") };
}
