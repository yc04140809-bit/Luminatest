import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { SecretsStore } from "./secretsStore.js";

/** 実際の packages/backend/.env を汚さないよう、テストごとに使い捨てのファイルパスを発行する。 */
function tempEnvPath(): string {
  return path.join(tmpdir(), `chaos-ai-suite-test-${randomUUID()}.env`);
}

/** set()はprocess.envにも書き込むため、テストプロセス全体を汚さないよう必ず後片付けする。 */
function cleanup(filePath: string, ...envKeys: string[]): void {
  if (existsSync(filePath)) rmSync(filePath);
  for (const key of envKeys) delete process.env[key];
}

test("set/get round-trips and persists to the .env file", () => {
  const filePath = tempEnvPath();
  try {
    const store = new SecretsStore(filePath);
    store.set("SLACK_WEBHOOK_URL", "https://hooks.slack.example/test");

    assert.equal(store.get("SLACK_WEBHOOK_URL"), "https://hooks.slack.example/test");
    assert.equal(store.isConfigured("SLACK_WEBHOOK_URL"), true);
    assert.ok(existsSync(filePath), "should write the .env file");

    // 新しいインスタンス（＝プロセス再起動を模擬）でも読み込めること
    const reloaded = new SecretsStore(filePath);
    assert.equal(reloaded.get("SLACK_WEBHOOK_URL"), "https://hooks.slack.example/test");
  } finally {
    cleanup(filePath, "SLACK_WEBHOOK_URL");
  }
});

test("multi-line values (e.g. a PEM private key) survive persist + reload", () => {
  const filePath = tempEnvPath();
  const pem = "-----BEGIN PRIVATE KEY-----\nline1\nline2\n-----END PRIVATE KEY-----\n";
  try {
    const store = new SecretsStore(filePath);
    store.set("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", pem);

    const reloaded = new SecretsStore(filePath);
    assert.equal(reloaded.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"), pem);
  } finally {
    cleanup(filePath, "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  }
});

test("clear removes the value and it no longer reloads", () => {
  const filePath = tempEnvPath();
  try {
    const store = new SecretsStore(filePath);
    store.set("NOTION_API_KEY", "secret_123");
    store.clear("NOTION_API_KEY");

    assert.equal(store.get("NOTION_API_KEY"), undefined);
    assert.equal(store.isConfigured("NOTION_API_KEY"), false);

    const reloaded = new SecretsStore(filePath);
    assert.equal(reloaded.get("NOTION_API_KEY"), undefined);
  } finally {
    cleanup(filePath);
  }
});

test("set/clear reject unknown keys", () => {
  const filePath = tempEnvPath();
  try {
    const store = new SecretsStore(filePath);
    assert.throws(() => store.set("NOT_A_REAL_SECRET", "value"));
    assert.throws(() => store.clear("NOT_A_REAL_SECRET"));
  } finally {
    cleanup(filePath);
  }
});

test("listStatus never exposes the actual value, only configured booleans", () => {
  const filePath = tempEnvPath();
  try {
    const store = new SecretsStore(filePath);
    store.set("SLACK_WEBHOOK_URL", "https://hooks.slack.example/should-not-leak");

    const status = store.listStatus();
    const slack = status.find((entry) => entry.key === "SLACK_WEBHOOK_URL");
    assert.equal(slack?.configured, true);
    assert.equal(JSON.stringify(status).includes("should-not-leak"), false);

    const unset = status.find((entry) => entry.key === "NOTION_API_KEY");
    assert.equal(unset?.configured, false);
  } finally {
    cleanup(filePath, "SLACK_WEBHOOK_URL");
  }
});
