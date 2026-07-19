// folder-note-links: make bare `[[Folder]]` wikilinks resolve to Obsidian
// folder notes (`Folder/Folder.md`) that Quartz slugs as `.../folder/index`.
// Load it AFTER crawl-links (a higher `order`) so it repairs the resolved links.
export { FolderNoteLinks } from "./folderNoteLinks";
