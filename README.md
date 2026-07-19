# quartz-folder-note-links

A [Quartz](https://quartz.jzhao.xyz/) (v5 / [quartz-community](https://github.com/quartz-community) fork) transformer plugin that makes bare `[[Folder]]` wikilinks resolve to **Obsidian folder notes** stored as `Folder/Folder.md`.

## The problem

The popular [Obsidian Folder Notes](https://github.com/LostPaul/obsidian-folder-notes) plugin stores a folder's landing note as `Folder/Folder.md` (so the tab shows a real title like "Austria" instead of "index"). Quartz slugs that note as `.../folder/index`.

Quartz's `crawl-links` "shortest" resolver matches wikilinks by a slug's **last path segment** — which for these notes is `index`, not the folder name. So a bare `[[Austria]]` never matches and falls back to a broken `/austria` root link (a 404). Every folder-note link in the vault breaks.

This is upstream issue [jackyzha0/quartz#2078](https://github.com/jackyzha0/quartz/issues/2078), closed without a fix and still present in v5. Renaming to `folder/index.md` does **not** help this fork — it produces the identical `.../index` slug.

## The fix

This plugin runs as a transformer **after** `crawl-links` and repairs the resolved links directly:

- Any internal link whose resolved `data-slug` doesn't exist, but for which a `.../<name>/index` folder note **does**, is re-pointed at that folder note.
- The `href` is rewritten to the correct relative path (anchors preserved), and `data-slug` is corrected.
- No aliases, no redirect pages, no changes to your notes.
- Ambiguous names (two folder notes with the same name) are left untouched, so a link is never sent to the wrong page.

## Install

Add it to `quartz.config.yaml` with an `order` **higher than `crawl-links`** (which defaults to 60):

```yaml
plugins:
  - source: github:JasonSooter/quartz-folder-note-links
    enabled: true
    order: 65
```

Then `npx quartz plugin install --from-config && npx quartz build`.

## How it works

`htmlPlugins(ctx)` receives `ctx.allSlugs`, from which the plugin builds a map of folder-note name → full slug. As it walks each page's `<a class="internal">` links, it checks the `data-slug` that `crawl-links` resolved; if that slug is broken but a matching folder note exists, it recomputes the href with `resolveRelative` from `@quartz-community/utils`.

## License

MIT
