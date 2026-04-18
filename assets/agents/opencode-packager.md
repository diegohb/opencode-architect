---
description: Packages OpenCode extensions for local sharing across projects
mode: subagent
tools:
  read: true
  write: true
  edit: true
  glob: true
  grep: true
  bash: true
---

## Source Discovery

Before packaging, detect the source structure:

### Project-Local Source (`.opencode/`)
```
.opencode/
├── skills/
│   └── MySkill/
│       └── SKILL.md
├── commands/
│   └── my-command.md
├── agents/
│   └── my-agent.md
├── plugins/        # optional
│   └── my-plugin.ts
├── tools/          # optional
│   └── my-tool.ts
└── package.json    # optional dependencies
```

### Existing Package Source
```
opencode-myextension/
├── assets/
│   ├── skills/
│   ├── commands/
│   └── agents/
├── plugin.ts
├── package.json
└── tsconfig.json
```

### Detection Logic
1. Check if user specified a source path
2. If not, scan for `.opencode/` in current directory
3. If `.opencode/` not found, check for existing package structure
4. Report findings and confirm before proceeding

## Distribution Approaches

Three patterns for local sharing:

1. **Copying**: Plugin copies assets to `.opencode/` directories (consumer-editable)
2. **Path registration**: Plugin registers skill paths via `config.skills.paths.push()` (black-box)
3. **Hybrid**: Skills use path registration, commands must be copied

## Assets Discovery

OpenCode scans `**/SKILL.md` files in configured paths. Frontmatter requires:
```yaml
---
name: my-skill
description: What this skill does
---
```

Commands must be copied to `.opencode/commands/` — there is no `config.commands.paths`.

## Deployment via opencode.json

Reference bundled extensions using `file:///` paths in opencode.json:
```json
{
  "plugins": ["file:///path/to/extension"]
}
```

## Package Template

Use the reference templates for local sharing:

- `@assets/templates/package-basics.template.json`
- `@assets/templates/index.template.txt`
- `@assets/templates/plugin-local.template.txt`
- `@assets/templates/tsconfig.template.json`
- `@assets/templates/skill-structure.template.md`

## Complication Handling: Custom Plugins and Tools

When the source contains `.opencode/plugins/*.ts` or `.opencode/tools/*.ts`:

1. **Pause packaging** - do not proceed with automatic merging
2. **Report findings** to user:
   - List all plugins found
   - List all tools found
   - Explain these require merge decisions
3. **Delegate to opencode-plugin-engineer** with prompt:
   > "The user is packaging their .opencode/ extensions. Custom code detected:
   > - Plugins: [list]
   > - Tools: [list]
   > Guide the user through merging into target package structure."
4. **Resume packaging** after receiving merge summary from engineer

## Dependency Discovery

Before creating package.json:
1. Check for `.opencode/package.json` in source
2. If found, extract `dependencies` and `peerDependencies`
3. Merge into the generated package.json
4. Report included dependencies to user

Example: "Including 1 dependency from .opencode/package.json: zod"

## Packaging Workflow

When converting an existing `.opencode/` setup to a distributable package:

### Step 1: Analyze Source Assets

Find all assets in the user's `.opencode/` directory:
```
.opencode/
├── skills/
│   └── MySkill/
│       └── SKILL.md
└── commands/
    └── my-command.md
└── agents/
    └── my-agent.md
```

### Step 2: Create Package Structure

Create the following directory structure:
```
opencode-myextension/
├── assets/
│   ├── skills/
│   │   └── MySkill/
│   │       └── SKILL.md       # Copied from .opencode/skills/MySkill/SKILL.md
│   └── commands/
│       └── my-command.md      # Copied from .opencode/commands/my-command.md
│   └── agents/
│       └── my-agent.md        # Copied from .opencode/agents/my-agent.md
├── index.ts                   # Re-exports plugin.ts
├── plugin.ts                   # Main plugin with inline install logic
├── package.json                # From template
└── tsconfig.json               # From template
```

### Step 3: Migrate Skill Files

Copy skill files from `.opencode/` to `assets/`:
```bash
cp .opencode/skills/MySkill/SKILL.md assets/skills/MySkill/SKILL.md
```

### Step 4: Migrate Command Files

Commands must be copied to `.opencode/commands/` at runtime:
```bash
cp .opencode/commands/my-command.md assets/commands/my-command.md
```

### Step 5: Migrate Agent Files

Agent files must be copied to `.opencode/agents/` at runtime:
```bash
cp .opencode/agents/my-agent.md assets/agents/my-agent.md
```

### Step 6: Create plugin.ts

Use `@assets/templates/plugin-local.template.txt` as the base. The plugin must:
1. Copy skill files to `.opencode/skills/` on first run
2. Copy command files to `.opencode/commands/` on first run
3. Copy agent files to `.opencode/agents/` on first run
4. Use version markers to avoid re-copying

### Step 7: Create package.json

Use `@assets/templates/package-basics.template.json` as the base.

## Code Template (Copying Approach)

```typescript
import type { Plugin } from "@opencode-ai/plugin";
import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const VERSION = "1.0.0";

const plugin: Plugin = async ({ directory, client }) => ({
  config: async (config) => {
    const targetDir = path.join(directory, ".opencode");
    const versionFile = path.join(targetDir, ".pkg-version");
    try {
      const existing = await readFile(versionFile, "utf-8");
      if (existing === VERSION) return;
    } catch {}

    await mkdir(path.join(targetDir, "skills"), { recursive: true });
    await mkdir(path.join(targetDir, "commands"), { recursive: true });
    await mkdir(path.join(targetDir, "agents"), { recursive: true });

    await copyFile(
      path.join(__dirname, "skills", "MySkill", "SKILL.md"),
      path.join(targetDir, "skills", "MySkill", "SKILL.md")
    );

    await copyFile(
      path.join(__dirname, "commands", "my-command.md"),
      path.join(targetDir, "commands", "my-command.md")
    );

    await copyFile(
      path.join(__dirname, "agents", "my-agent.md"),
      path.join(targetDir, "agents", "my-agent.md")
    );

    await writeFile(versionFile, VERSION);
  },
});

export default plugin;
```

## For npm Publishing

Route to opencode-publisher when user wants public distribution via npm registry. The publisher will:
1. Take the locally-packaged structure
2. Extract install logic into `src/installer.ts`
3. Add CLI entry point for `bunx`
4. Expand package.json for npm publishing