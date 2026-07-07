import { test } from "node:test";
import assert from "node:assert/strict";
import { ToolRegistry } from "./toolRegistry.js";
import type { ToolExecutor } from "./types.js";

function makeExecutor(id: string, allowedAgentIds: string[]): ToolExecutor {
  return {
    definition: {
      id,
      name: id,
      description: "テスト用ツール",
      allowedAgentIds,
      inputSchema: { properties: {}, required: [] },
    },
    async execute() {
      return { summary: "ok" };
    },
  };
}

test("listForAgent only returns tools that allow the given agent", () => {
  const registry = new ToolRegistry();
  registry.register(makeExecutor("tool_a", ["agent-nemuri"]));
  registry.register(makeExecutor("tool_b", ["agent-mirai"]));
  registry.register(makeExecutor("tool_c", ["agent-nemuri", "agent-sayla"]));

  const forNemuri = registry.listForAgent("agent-nemuri").map((definition) => definition.id);
  assert.deepEqual(forNemuri.sort(), ["tool_a", "tool_c"]);

  const forMirai = registry.listForAgent("agent-mirai").map((definition) => definition.id);
  assert.deepEqual(forMirai, ["tool_b"]);

  assert.deepEqual(registry.listForAgent("agent-chaos"), []);
});

test("canUse is true only for a registered tool AND an allowed agent", () => {
  const registry = new ToolRegistry();
  registry.register(makeExecutor("tool_a", ["agent-nemuri"]));

  assert.equal(registry.canUse("agent-nemuri", "tool_a"), true);
  assert.equal(registry.canUse("agent-mirai", "tool_a"), false, "agent not in allowedAgentIds");
  assert.equal(registry.canUse("agent-nemuri", "tool_unknown"), false, "tool not registered");
});

test("get returns the executor and list returns all definitions", () => {
  const registry = new ToolRegistry();
  const executor = makeExecutor("tool_a", ["agent-nemuri"]);
  registry.register(executor);

  assert.equal(registry.get("tool_a"), executor);
  assert.equal(registry.get("missing"), undefined);
  assert.deepEqual(
    registry.list().map((definition) => definition.id),
    ["tool_a"],
  );
});
