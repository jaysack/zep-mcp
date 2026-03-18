#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ZepClient } from "@getzep/zep-cloud";
import { z } from "zod";

// --- Init ---

const apiKey = process.env.ZEP_API_KEY;
if (!apiKey) {
  console.error("ZEP_API_KEY environment variable is required");
  process.exit(1);
}

const client = new ZepClient({ apiKey });

const server = new McpServer({
  name: "zep-cloud",
  version: "1.0.0",
});

// --- Tools ---

server.tool(
  "zep_search_memory",
  "Search a user's knowledge graph for relevant facts and memories",
  {
    user_id: z.string().describe("The Zep user ID to search"),
    query: z.string().describe("Natural language search query"),
    limit: z.number().optional().default(10).describe("Max results (default 10, max 50)"),
  },
  async ({ user_id, query, limit }) => {
    try {
      const results = await client.graph.search({
        query,
        userId: user_id,
        scope: "edges",
        limit,
      });

      const facts = (results.edges ?? []).map((edge) => ({
        fact: edge.fact,
        name: edge.name,
        score: edge.score,
        created_at: edge.createdAt,
        valid_at: edge.validAt,
        invalid_at: edge.invalidAt,
      }));

      return {
        content: [
          {
            type: "text",
            text: facts.length
              ? JSON.stringify(facts, null, 2)
              : "No matching facts found.",
          },
        ],
      };
    } catch (error) {
      console.error("zep_search_memory error:", error);
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }
);

server.tool(
  "zep_add_note",
  "Add a fact or note to a user's knowledge graph",
  {
    user_id: z.string().describe("The Zep user ID"),
    note: z.string().describe("The fact or note to store"),
  },
  async ({ user_id, note }) => {
    try {
      const episode = await client.graph.add({
        data: note,
        userId: user_id,
        type: "text",
      });

      return {
        content: [
          {
            type: "text",
            text: `Note added successfully (episode: ${episode.uuid}).`,
          },
        ],
      };
    } catch (error) {
      console.error("zep_add_note error:", error);
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }
);

server.tool(
  "zep_get_context",
  "Get memory context for a thread — useful for injecting relevant memories into prompts",
  {
    thread_id: z.string().describe("The Zep thread ID"),
  },
  async ({ thread_id }) => {
    try {
      const response = await client.thread.getUserContext(thread_id);

      return {
        content: [
          {
            type: "text",
            text: response.context ?? "No context available for this thread.",
          },
        ],
      };
    } catch (error) {
      console.error("zep_get_context error:", error);
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }
);

server.tool(
  "zep_add_messages",
  "Store messages in a Zep thread for memory extraction",
  {
    thread_id: z.string().describe("The Zep thread ID"),
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant", "system", "tool", "function", "norole"]),
          content: z.string(),
          name: z.string().optional().describe("Sender name (e.g. 'john', 'sales_agent')"),
        })
      )
      .describe("Messages to add to the thread"),
  },
  async ({ thread_id, messages }) => {
    try {
      const response = await client.thread.addMessages(thread_id, {
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
          name: m.name,
        })),
      });

      return {
        content: [
          {
            type: "text",
            text: `Added ${messages.length} message(s) to thread ${thread_id}.`,
          },
        ],
      };
    } catch (error) {
      console.error("zep_add_messages error:", error);
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }
);

server.tool(
  "zep_create_user",
  "Create or ensure a Zep user exists",
  {
    user_id: z.string().describe("Unique user identifier"),
    email: z.string().optional().describe("User email"),
    first_name: z.string().optional().describe("User first name"),
    last_name: z.string().optional().describe("User last name"),
  },
  async ({ user_id, email, first_name, last_name }) => {
    try {
      // Try to get existing user first
      try {
        const existing = await client.user.get(user_id);
        return {
          content: [
            {
              type: "text",
              text: `User "${user_id}" already exists (created: ${existing.createdAt}).`,
            },
          ],
        };
      } catch {
        // User doesn't exist, create them
      }

      const user = await client.user.add({
        userId: user_id,
        email,
        firstName: first_name,
        lastName: last_name,
      });

      return {
        content: [
          {
            type: "text",
            text: `User "${user_id}" created successfully.`,
          },
        ],
      };
    } catch (error) {
      console.error("zep_create_user error:", error);
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }
);

server.tool(
  "zep_create_thread",
  "Create a new conversation thread for a user",
  {
    thread_id: z.string().describe("Unique thread identifier"),
    user_id: z.string().describe("The Zep user ID to associate with this thread"),
  },
  async ({ thread_id, user_id }) => {
    try {
      const thread = await client.thread.create({
        threadId: thread_id,
        userId: user_id,
      });

      return {
        content: [
          {
            type: "text",
            text: `Thread "${thread_id}" created for user "${user_id}".`,
          },
        ],
      };
    } catch (error) {
      console.error("zep_create_thread error:", error);
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }
);

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Zep Cloud MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
