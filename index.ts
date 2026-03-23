import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import type { AgentConfig } from "@opencode-ai/sdk";
import { command as syncDocsCommand } from "./commands/sync-docs";
import { OpenCodeDocsFetcher } from "./scripts/fetch-opencode-docs";
import { SilentLogger } from "./scripts/logger";
import { createSyncDocsTool } from "./tools/sync-docs";

const AGENTS_DIR = path.join(import.meta.dirname, "assets", "agents");

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

interface AgentFrontmatter {
  description: string;
  mode: "primary" | "subagent" | "all";
  tools?: Record<string, boolean>;
}

async function parseAgentMarkdown(content: string, agentName: string): Promise<AgentConfig> {
  const match = content.match(FRONTMATTER_REGEX);

  if (!match || match.length < 3) {
    throw new Error(`Agent ${agentName} must have YAML frontmatter`);
  }

  const frontmatterYaml = match[1] as string;
  const rawPrompt = match[2] as string;
  const frontmatter = parseYaml(frontmatterYaml) as AgentFrontmatter;
  const prompt = rawPrompt.replace(/^\r?\n/, "");

  const config: AgentConfig = {
    description: frontmatter.description,
    mode: frontmatter.mode,
    prompt,
  };

  if (frontmatter.tools) {
    config.tools = frontmatter.tools;
  }

  return config;
}

const OpencodeArchitect: Plugin = async (input) => {
  const syncDocsTool = createSyncDocsTool();

  syncDocsOnStartup(input.client);

  const agents = await loadAgents();

  return {
    config: async (config) => {
      config.agent = config.agent || {};
      config.command = config.command || {};

      for (const [name, agentConfig] of Object.entries(agents)) {
        config.agent[name] = agentConfig;
      }

      config.command["sync-docs"] = syncDocsCommand;
    },
    tool: {
      "sync-docs": syncDocsTool,
    },
  };
};

export default OpencodeArchitect;

async function loadAgents(): Promise<Record<string, AgentConfig>> {
  const agentFiles = [
    "opencode-agent-designer.md",
    "opencode-architect.md",
    "opencode-command-crafter.md",
    "opencode-packager.md",
    "opencode-publisher.md",
    "opencode-mcp-integrator.md",
    "opencode-plugin-engineer.md",
    "opencode-skill-creator.md",
    "opencode-tool-builder.md",
  ];

  const agents: Record<string, AgentConfig> = {};

  for (const filename of agentFiles) {
    const agentPath = path.join(AGENTS_DIR, filename);
    const agentContent = await readFile(agentPath, "utf-8");
    const agentName = path.basename(filename, ".md");
    agents[agentName] = await parseAgentMarkdown(agentContent, agentName);
  }

  return agents;
}

function syncDocsOnStartup(client: PluginInput["client"]): void {
  const fetcher = new OpenCodeDocsFetcher(new SilentLogger());
  fetcher.run().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    client.tui.showToast({
      body: {
        message: `Failed to sync OpenCode docs: ${message}`,
        variant: "error",
      },
    });
  });
}
