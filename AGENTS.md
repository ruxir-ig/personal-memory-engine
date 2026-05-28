<!-- pi-ephemeral -->
# Project-local ephemeral resources

When working in this repository, prefer project-local AI tool configuration under `.pi/` for temporary or repo-specific capabilities.

Pi has a global `/ephemeral` command that can select resources from the catalog at `~/.pi/ephemeral` and apply them into the current project.

Catalog locations:

- `~/.pi/ephemeral/skills/<name>/SKILL.md` - reusable skills
- `~/.pi/ephemeral/prompts/<name>.md` - prompt templates
- `~/.pi/ephemeral/extensions/<name>.ts` or `<name>/index.ts` - pi extensions
- `~/.pi/ephemeral/mcp/mcp.json` - MCP server catalog

Project state managed by `/ephemeral`:

- `.pi/ephemeral.json` - manifest of selected resources
- `.pi/skills/` - copied project-local skills
- `.pi/prompts/` - copied project-local prompts
- `.pi/extensions/` - copied single-file extensions
- `.pi/ephemeral/extensions/` - referenced package extensions
- `.pi/settings.json` - project extension references
- `.pi/mcp.json` - project MCP servers

Rules for coding agents:

1. If the user asks for a project-specific skill, prompt, extension, MCP server, workflow, or reusable automation, consider creating or updating a resource in the repo's `.pi/` directory.
2. If using pi interactively, prefer `/ephemeral` to select from `~/.pi/ephemeral` instead of manually copying catalog resources.
3. Do not edit `.pi/ephemeral.json` by hand unless necessary; it is the manifest for managed resources.
4. If a `.pi/ephemeral.json` manifest exists, respect it and avoid deleting managed `.pi/` resources without updating the manifest.
5. For non-pi tools like Codex, OpenCode, Cursor, Claude Code, or similar, treat `.pi/skills`, `.pi/prompts`, `.pi/extensions`, and `.pi/mcp.json` as project-local source-of-truth context when relevant, even if the tool cannot load pi extensions directly.
<!-- /pi-ephemeral -->
