# OpenCode Architect One-Shot Examples

Reference examples for routing decisions. Each shows: request → analysis → agent selection → execution order.

---

## Example 1: Test Baselining Plugin

**User Request:**
> Scaffold a plugin with skill "test-baselining" and command "test-baseline" that takes args init|eval|update. Generalize from example files.

**Analysis:**
- Skill creation → `opencode-skill-creator`
- Command with argument handling → `opencode-command-crafter`
- npm package for distribution → `opencode-packager`

**Execution:**
1. Parallel: `opencode-skill-creator` (SKILL.md + XML template)
2. Parallel: `opencode-command-crafter` (command with `$1` placeholder)
3. Sequential: `opencode-packager` (package.json + README)

---

## Example 2: MCP Server Integration

**User Request:**
> Add a custom MCP server "my-company-tools" with 5 tools. Scope tools so only the "build" agent can access "deploy-*" tools.

**Analysis:**
- MCP server configuration → `opencode-mcp-integrator`
- No skill/command/tool creation needed
- Tool scoping is MCP configuration, not custom tool building

**Execution:**
1. Single: `opencode-mcp-integrator` - configure server in opencode.json with permission rules

**Config produced:**
```json
{
  "mcp": {
    "my-company-tools": {
      "command": "npx",
      "args": ["-y", "@my-company/mcp-server"]
    }
  },
  "permission": {
    "tool": {
      "deploy-*": "deny"
    }
  },
  "agent": {
    "build": {
      "permission": {
        "tool": {
          "deploy-*": "allow"
        }
      }
    }
  }
}
```

---

## Example 3: Commit Message Validator Tool

**User Request:**
> Create a custom tool "validate-commit" that checks commit messages follow conventional commits format. It should work in the current git repo.

**Analysis:**
- Custom tool with schema + execute logic → `opencode-tool-builder`
- Not a skill (no SKILL.md)
- Not a command (needs to be callable by agents as a tool)
- Not MCP (local tool, not external server)

**Execution:**
1. Single: `opencode-tool-builder` - create plugin with tool definition

**Tool structure:**
```typescript
// .opencode/plugins/commit-validator.ts
import { tool } from "@opencode-ai/plugin"

export const CommitValidatorPlugin = async (ctx) => {
  return {
    tool: {
      "validate-commit": tool({
        description: "Validate commit message follows conventional commits",
        args: {
          message: tool.schema.string().describe("Commit message to validate")
        },
        async execute(args, context) {
          const pattern = /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?:\s.+/
          const valid = pattern.test(args.message)
          return { valid, message: args.message }
        }
      })
    }
  }
}
```

---

## Example 4: Code Review Agent

**User Request:**
> Create a "pr-reviewer" agent that reviews pull requests. It should have access to github tools but not bash or write tools. Load the "git-release" skill automatically.

**Analysis:**
- Agent definition with permissions → `opencode-agent-designer`
- Needs specific tool allowlist/denylist
- Skill pre-loading configuration
- Not creating a skill, just referencing existing one

**Execution:**
1. Single: `opencode-agent-designer` - create agent frontmatter

**Agent structure:**
```markdown
---
name: pr-reviewer
description: Review pull requests with security and quality focus
tools:
  bash: false
  write: false
  edit: false
  github: true
  read: true
  grep: true
  glob: true
permission:
  skill:
    "git-release": "allow"
model: anthropic/claude-3.5-sonnet
---

## Role
Review PRs for code quality, security vulnerabilities, and test coverage.

## Workflow
1. Fetch PR diff using github tools
2. Analyze changes for patterns and issues
3. Provide structured feedback
```

---

## Example 5: Multi-Component Plugin Package

**User Request:**
> Create a distributable package "opencode-devtools" that includes: a skill "debug-workflow", a command "/debug" that loads the skill, and a plugin that auto-injects environment variables.

**Analysis:**
- Skill creation → `opencode-skill-creator`
- Command creation → `opencode-command-crafter`
- Plugin with hooks → `opencode-plugin-engineer`
- Package bundling → `opencode-packager`

**Execution:**
1. Parallel: `opencode-skill-creator` (debug-workflow SKILL.md)
2. Parallel: `opencode-command-crafter` (debug.md command)
3. Parallel: `opencode-plugin-engineer` (env-inject plugin)
4. Sequential: `opencode-packager` (package all into distributable)

**Package structure:**
```
opencode-devtools/
├── package.json
├── .opencode/
│   ├── skills/debug-workflow/SKILL.md
│   ├── commands/debug.md
│   └── plugins/env-inject.ts
```

---

## Example 6: Local-Only Session Notification Plugin (plugin-engineer, NOT packager)

**User Request:**
> Create a plugin that sends a desktop notification when a session completes or errors. This is for my local machine only, not for publishing.

**Analysis:**
- Plugin with event hooks → `opencode-plugin-engineer`
- **NOT** packager because:
  - No npm distribution needed
  - No skills or commands to bundle
  - Single local plugin file, not a package
  - User explicitly said "local machine only"

**Execution:**
1. Single: `opencode-plugin-engineer` - create local plugin with event hooks

**Plugin structure:**
```typescript
// .opencode/plugins/session-notify.ts
import type { Plugin } from "@opencode-ai/plugin"

export const SessionNotifyPlugin: Plugin = async ({ $ }) => {
  return {
    "session.idle": async () => {
      await $`osascript -e 'display notification "Session complete" with title "OpenCode"'`
    },
    "session.error": async ({ event }) => {
      await $`osascript -e 'display notification "Session error" with title "OpenCode"'`
    }
  }
}
```

**Key distinction:**
| Use `plugin-engineer` when...        | Use `packager` when...              |
| ------------------------------------ | ----------------------------------- |
| Local-only plugin                    | Local package for sharing          |
| Event hooks / behavior modification  | Bundling skills + commands as assets|
| Single `.ts`/`.js` file              | Full package structure with package.json |
| No distribution intent              | Intended for local file:// sharing |
| Injecting env vars, notifications    | Combining multiple opencode artifacts |

---

## Example 7: Plugin with Embedded Static Instructions (plugin-engineer, NOT packager)

**User Request:**
> Create a customer support plugin that injects a "support-agent" prompt into sessions. The prompt should be embedded in the plugin file itself, not as separate files.

**Analysis:**
- Plugin that injects static content → `opencode-plugin-engineer`
- **NOT** packager because:
  - Instructions are embedded as string literals in code
  - No separate `.md` files to bundle
  - Content is generated/managed programmatically within the plugin
  - Not a distributable asset package

**Execution:**
1. Single: `opencode-plugin-engineer` - create plugin with embedded prompt string

**Plugin structure:**
```typescript
// .opencode/plugins/support-agent.ts
import type { Plugin } from "@opencode-ai/plugin"

const SUPPORT_AGENT_PROMPT = `
You are a customer support agent for Acme Corp.

## Guidelines
- Be empathetic and professional
- Escalate technical issues to engineering
- Never share internal policies with customers

## Response Format
1. Acknowledge the issue
2. Provide solution or next steps
3. Offer additional help
`

export const SupportAgentPlugin: Plugin = async ({ client }) => {
  return {
    "session.created": async ({ event }) => {
      await client.context.inject(SUPPORT_AGENT_PROMPT)
    }
  }
}
```

**Key distinction from packager:**

| Use `plugin-engineer` when...                    | Use `packager` when...            |
| ------------------------------------------------ | ---------------------------------- |
| Instructions embedded as string in code          | Separate `.md` files as assets     |
| Content generated programmatically               | Static markdown files to distribute|
| Single file contains logic + content             | Package structure with multiple files |
| Runtime-generated prompts                        | Pre-authored skill/command files  |
| Agent definitions with inline prompts            | Skill SKILL.md + command .md bundles |

**Real-world pattern (reference):**
```typescript
// Agent with embedded prompt - NO separate .md files
export const agent: AgentConfig = {
  name: "data-analyzer",
  prompt: `
    Analyze data files and produce reports.
    
    ## Steps
    1. Read input files
    2. Parse and validate
    3. Generate summary statistics
  `
}
```
