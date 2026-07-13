import { test } from "node:test";
import assert from "node:assert/strict";
import { THEME_PRESETS, type OfficeEvent } from "@chaos-ai-suite/shared";
import { OfficeStore } from "./officeStore.js";

test("updateTheme: switching preset resets custom overrides", () => {
  const store = new OfficeStore();
  const [first, second] = THEME_PRESETS;
  assert.ok(first && second, "expects at least two seed presets");

  store.updateTheme({ overrides: { accent: "#123456" } });
  assert.equal(store.getTheme().overrides.accent, "#123456");

  store.updateTheme({ presetId: second.id });
  assert.equal(store.getTheme().presetId, second.id);
  assert.deepEqual(store.getTheme().overrides, {}, "overrides should reset on preset switch");
});

test("updateTheme: overrides merge without clobbering other tokens", () => {
  const store = new OfficeStore();
  store.updateTheme({ overrides: { accent: "#111111" } });
  store.updateTheme({ overrides: { gold: "#222222" } });

  const theme = store.getTheme();
  assert.equal(theme.overrides.accent, "#111111");
  assert.equal(theme.overrides.gold, "#222222");
});

test("updateTheme: resetOverrides clears all custom colors", () => {
  const store = new OfficeStore();
  store.updateTheme({ overrides: { accent: "#111111", gold: "#222222" } });
  store.updateTheme({ resetOverrides: true });

  assert.deepEqual(store.getTheme().overrides, {});
});

test("updateTheme: preset switch plus overrides in the same call applies both", () => {
  const store = new OfficeStore();
  const target = THEME_PRESETS[THEME_PRESETS.length - 1]!;

  store.updateTheme({ presetId: target.id, overrides: { bg: "#000000" } });

  const theme = store.getTheme();
  assert.equal(theme.presetId, target.id);
  assert.equal(theme.overrides.bg, "#000000");
});

test("deleteAgent emits agent_deleted so subscribers can drop it from local state", () => {
  const store = new OfficeStore();
  const created = store.createAgent({
    name: "テストくん",
    title: "テスト担当AI",
    roleKey: "test-role",
    description: "テスト用エージェント",
    responsibilities: [],
    triggers: [],
    systemPrompt: "テスト用",
    accentColor: "#ffffff",
    deskPosition: { x: 0, y: 0 },
    model: { provider: "anthropic", model: "claude-sonnet-5", temperature: 0.5, maxOutputTokens: 1536 },
    enabled: true,
    isEditable: true,
  });

  const events: OfficeEvent[] = [];
  store.subscribe((event) => events.push(event));

  const deleted = store.deleteAgent(created.id);

  assert.equal(deleted, true);
  assert.equal(store.getAgent(created.id), undefined);
  assert.ok(
    events.some((event) => event.type === "agent_deleted" && event.agentId === created.id),
    "should emit agent_deleted with the deleted agent's id",
  );
});

test("deleteAgent returns false and emits nothing for an unknown id", () => {
  const store = new OfficeStore();
  const events: OfficeEvent[] = [];
  store.subscribe((event) => events.push(event));

  const deleted = store.deleteAgent("agent-does-not-exist");

  assert.equal(deleted, false);
  assert.equal(events.length, 0);
});

test("updateBrandProfile: merges patch and emits brand_profile_updated", () => {
  const store = new OfficeStore();
  const events: OfficeEvent[] = [];
  store.subscribe((event) => events.push(event));

  const before = store.getBrandProfile();
  const updated = store.updateBrandProfile({ name: "テストブランド", enabled: false });

  assert.equal(updated.name, "テストブランド");
  assert.equal(updated.enabled, false);
  assert.equal(updated.brandStatement, before.brandStatement, "untouched fields should be preserved");
  assert.equal(store.getBrandProfile().name, "テストブランド");
  assert.equal(events.length, 1);
  assert.deepEqual(events[0], { type: "brand_profile_updated", brandProfile: updated });
});

test("resetBrandProfile: restores default content while keeping the same id", () => {
  const store = new OfficeStore();
  const original = store.getBrandProfile();
  store.updateBrandProfile({ name: "変更後", enabled: false });

  const reset = store.resetBrandProfile();

  assert.equal(reset.id, original.id);
  assert.equal(reset.name, original.name);
  assert.equal(reset.enabled, original.enabled);
  assert.equal(store.getBrandProfile().name, original.name);
});
