import type { QuartzTransformerPlugin, BuildCtx } from "@quartz-community/types";
import type { FullSlug } from "@quartz-community/utils";
import { resolveRelative, simplifySlug, splitAnchor } from "@quartz-community/utils";
import { visit } from "unist-util-visit";
import type { Root, Element } from "hast";
import type { VFile } from "vfile";

/**
 * The Obsidian Folder Notes plugin stores a folder's landing note as
 * `Folder/Folder.md` (so the tab shows a real title, not "index"). Quartz's
 * community fork slugs that as `.../folder/index`. Its crawl-links "shortest"
 * resolver matches wikilinks by a slug's *last* path segment, which for these
 * notes is `index` — so a bare `[[Folder]]` never matches and falls back to a
 * broken `/folder` root link (a 404). This is upstream issue jackyzha0/quartz
 * #2078, still unresolved in v5.
 *
 * This transformer runs AFTER crawl-links (give it a higher `order`) and repairs
 * those links: any internal link whose resolved `data-slug` doesn't exist, but
 * for which a `.../<name>/index` folder note does, is re-pointed at the folder
 * note. No aliases, no redirects — the href is rewritten directly.
 */

/** Map a folder note's name (segment before `/index`) to its full slug. */
function buildFolderNoteIndex(allSlugs: readonly string[]): Map<string, string> {
  // A name that maps to more than one folder note is ambiguous; store `null`
  // and skip it so we never rewrite a link to the wrong page.
  const byName = new Map<string, string | null>();
  for (const slug of allSlugs) {
    if (!slug.endsWith("/index")) continue;
    const parts = slug.split("/");
    if (parts.length < 2) continue; // skip the site root "index"
    const name = parts[parts.length - 2];
    if (!name) continue;
    byName.set(name, byName.has(name) ? null : slug);
  }
  const out = new Map<string, string>();
  for (const [name, slug] of byName) if (slug) out.set(name, slug);
  return out;
}

export const FolderNoteLinks: QuartzTransformerPlugin = () => ({
  name: "FolderNoteLinks",
  htmlPlugins(ctx: BuildCtx) {
    return [
      () => {
        const allSlugs = (ctx.allSlugs ?? []) as string[];
        const slugSet = new Set(allSlugs);
        const folderIndex = buildFolderNoteIndex(allSlugs);

        return (tree: Root, file: VFile) => {
          const fileSlug = file.data.slug as FullSlug | undefined;
          if (!fileSlug) return;

          visit(tree, "element", (node: Element) => {
            if (node.tagName !== "a" || !node.properties) return;
            const classes = (node.properties.className ?? []) as string[];
            if (!Array.isArray(classes) || !classes.includes("internal")) return;

            const dataSlug = node.properties["data-slug"];
            if (typeof dataSlug !== "string" || slugSet.has(dataSlug)) return; // already resolves

            // Prefer an exact folder-note match at the resolved path
            // (e.g. link resolved to `foo/bar`, and `foo/bar/index` exists),
            // then fall back to a bare-name match (`[[Bar]]` -> `.../bar/index`).
            let targetFull: string | undefined;
            if (slugSet.has(`${dataSlug}/index`)) {
              targetFull = `${dataSlug}/index`;
            } else {
              const lastSegment = dataSlug.split("/").pop() ?? dataSlug;
              targetFull = folderIndex.get(lastSegment);
            }
            if (!targetFull) return;

            const href = typeof node.properties.href === "string" ? node.properties.href : "";
            const [, anchor] = splitAnchor(href);
            node.properties.href =
              resolveRelative(fileSlug, simplifySlug(targetFull as FullSlug)) + (anchor ?? "");
            node.properties["data-slug"] = targetFull;

            // Drop the "broken" marker crawl-links may have added.
            const brokenAt = classes.indexOf("broken");
            if (brokenAt >= 0) {
              classes.splice(brokenAt, 1);
              node.properties.className = classes;
            }
          });
        };
      },
    ];
  },
});
