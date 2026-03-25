# Coding Best Practices

## What This Product Is

This package is an OpenCode plugin that bundles a set of specialized agents and utilities for building OpenCode projects. It registers expert agents for architecture, agent design, command crafting, MCP integration, plugin engineering, skill creation, and tool building. It also exposes a `sync-docs` command and tool to fetch OpenCode documentation, and it syncs docs automatically at startup with a toast error if the sync fails.

## How It Works

The plugin entry in `index.ts` registers the agents and commands with the OpenCode plugin system. It also initializes a docs fetcher on startup and wires up a tool so the same sync can be triggered on demand. The project uses TypeScript source directly with Bun's native TS support.

## Why It Works This Way

The plugin model lets OpenCode discover and load the agents and commands without extra wiring. Centralizing the registration in the entry file keeps the integration surface clear, while automatic doc sync keeps prompt and coding guidance current for the bundled agents. The build step ensures the package ships stable ESM output and type declarations for downstream consumers.

## Contributing

Use the README for install/build steps and follow the coding best practices in this file. Keep agents, tools, and commands focused and cohesive, add new classes in separate files, and prefer descriptive names over comments. When adding a new agent or command, wire it through the plugin entry so it is available at runtime, and ensure docs sync behavior stays intact.

## Meta-Project Context

This package is a meta-project: agents created here produce instructions consumed by OTHER agents in end-users' projects. When you write agent prompts, skill instructions, or command templates, you are writing for agents that will be invoked by users who may not know OpenCode internals.

### The Happy Path

1. **User creates extensions** via `opencode-architect` delegating to specialist agents (skill-creator, command-crafter, agent-designer, plugin-engineer, tool-builder, mcp-integrator). Outputs default to `.opencode/`:
   - Skills at `.opencode/skills/<name>/SKILL.md`
   - Commands at `.opencode/commands/<name>.md`
   - Agents at `.opencode/agents/<name>.md`
   - Plugins at `.opencode/plugins/<name>.ts`
   - Tools at `.opencode/tools/<name>.ts`

2. **User iterates** on extensions based on usage feedback

3. **User wants reuse across projects** → delegates to `opencode-packager`:
   - Extracts `.opencode/` assets into a distributable package structure
   - Copies skills/commands/agents to `assets/` so consumers can view and edit
   - Creates `plugin.ts`, `package.json`, `tsconfig.json`

4. **User wants to share publicly** → `opencode-architect` hands off to `opencode-publisher`:
   - Transforms local package into npm-ready structure
   - Adds CLI entry point, extracts installer module
   - Publishes to npm registry

### Opinionated Design: Copying for Transparency

Skills, commands, and agents are COPIED to consumer's `.opencode/` rather than registered via `config.skills.paths`. This is intentional so end-users can see, read, and modify extension content locally. Plugins and tools remain as TypeScript code in the package.

### When Complications Arise

Custom plugins and tools in `.opencode/plugins/` or `.opencode/tools/` require merging during packaging. The packager delegates to `opencode-plugin-engineer` to guide the user through merge decisions.

### Agent Categories

| Category      | Agents                                         | Default Output         |
| ------------- | ---------------------------------------------- | ---------------------- |
| Creators      | skill-creator, command-crafter, agent-designer | `.opencode/`             |
| Engineers     | plugin-engineer, tool-builder, mcp-integrator  | `.opencode/`             |
| Distribution  | packager, publisher                            | New package directory  |
| Orchestration | architect                                      | Delegates to others    |

### Distribution Decision Tree

1. **Project-local only?** → No packaging
2. **Reuse across own projects?** → `opencode-packager` (local `file:///` package)
3. **Share with others?** → `opencode-packager` → `opencode-publisher` (npm)

## Function Declarations

Prefer `function` syntax over arrow functions assigned to variables:

```typescript
// Preferred
function processData(input: string): string {
  return input.trim();
}

// Avoid
const processData = (input: string): string => {
  return input.trim();
};
```

## Helper Function Placement

Place helper functions below their first usage and rely on hoisting. This keeps the main logic at the top of the file for better readability:

```typescript
// Main export or entry point first
export function main(): void {
  const result = helperFunction();
  console.log(result);
}

// Helper functions below
function helperFunction(): string {
  return "helper result";
}
```

## No Comments

Do not leave comments in code. Use descriptive method and variable names instead.

## Classes Over Helpers

Encapsulate related logic in classes with private methods instead of creating standalone helper functions.

## Nullable Over Optional

Avoid optional fields in types and interfaces. Use explicit nullable types:

```typescript
// Preferred
interface Config {
  value: string | null;
}

// Avoid
interface Config {
  value?: string;
}
```

## New Classes in Separate Files

When adding new classes, place each class in its own file instead of embedding new class declarations in large modules.
