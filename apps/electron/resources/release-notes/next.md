# Pending Release Notes

This file accumulates release notes for the next unreleased version. PRs that add user-visible behavior should append a bullet to the relevant section here. Versioned files (`X.Y.Z.md`) are owned by the release skill — never create them in feature commits.

## Features

## Improvements

- Move general conversations under All Sessions in the left sidebar and remove the middle conversation navigator, retaining selection and session business menus.

- Keep project conversations in a single primary pane, add project-scoped side conversations, restore the pinned new-session button, and keep unnamed drafts out of navigation until the first interaction.
- Open the browser in an independent window without taking space from project conversations.

- Refined the project sidebar with independent selection and expansion, project-scoped session creation, reusable session menus, validated project working directories, and isolated development configuration paths.

## Bug Fixes

- **Folder selection timeout** — Allow up to ten minutes for native folder selection across both RPC hops instead of dropping the selected path after thirty seconds.

- **Multiple project folders** — Open the folder chooser directly for empty projects, allow adding and removing linked folders in creation and settings, preserve legacy paths, and expose all folders to project agents with the first as the default command directory.

- **Project directory picker** — Keep the working-directory menu above the new-project dialog so recent folders and the native folder chooser remain accessible.

- **ChatGPT image generation** — Add a text-to-image tool for ChatGPT login connections, saving generated images in the current session with reusable inline previews, cancellation and no API-key fallback.

- **Reliable search result parsing** — Preserve completed streamed output items when ChatGPT search finishes with an empty output snapshot, retaining webpage citations instead of incorrectly reporting no content.

- **Consistent archived settings** — Register Archived alongside other settings pages so every settings menu shares its icon, alignment, selection and navigation, with workspace-scoped conversation viewing and restoration.

- Keep long project names within the sidebar so selection corners and the project-row new-session pencil remain visible, including when sessions are expanded.

## Breaking Changes
