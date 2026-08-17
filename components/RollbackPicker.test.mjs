import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  jsx: { runtime: "automatic" },
  tsconfigPaths: true,
});
const { RollbackPicker, filterRollbackEntries, getInitialRollbackIndex, normalizeRollbackText } = await jiti.import("./RollbackPicker.tsx");
const { I18nProvider } = await jiti.import("../hooks/useI18n.tsx");

const entry = (id, role, text) => ({ id, role, text, parentId: null, timestamp: "t" });

test("normalizes rollback preview text", () => {
  assert.equal(normalizeRollbackText("  第一行\n\n第二行 "), "第一行 第二行");
});

test("filters rollback entries by role and text", () => {
  const entries = [
    entry("u1", "user", "修复登录问题"),
    entry("a1", "assistant", "先看一下 auth 模块"),
    entry("u2", "user", "继续"),
  ];

  assert.deepEqual(filterRollbackEntries(entries, "auth").map((item) => item.id), ["a1"]);
  assert.deepEqual(filterRollbackEntries(entries, "user").map((item) => item.id), ["u1", "u2"]);
  assert.equal(filterRollbackEntries(entries, "  ").length, 3);
});

test("initial rollback selection prefers the current leaf", () => {
  const entries = [entry("u1", "user", "一"), entry("a1", "assistant", "二")];
  assert.equal(getInitialRollbackIndex(entries, "a1"), 1);
  assert.equal(getInitialRollbackIndex(entries, null), 1);
  assert.equal(getInitialRollbackIndex([], "a1"), 0);
});

test("renders the rollback picker as a dialog with keyboard hints", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      I18nProvider,
      null,
      React.createElement(RollbackPicker, {
        entries: [entry("u1", "user", "第一问"), entry("a1", "assistant", "第一答")],
        activeLeafId: "a1",
        open: true,
        onSelect() {},
        onClose() {},
      }),
    ),
  );

  assert.match(html, /role="dialog"/);
  assert.match(html, /Rollback to a previous message/);
  assert.match(html, /第一问/);
  assert.match(html, /current/);
  assert.match(html, /Enter rollback/);
  assert.match(html, /role="listbox"/);
});

test("renders the empty state for a fresh session", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      I18nProvider,
      null,
      React.createElement(RollbackPicker, {
        entries: [],
        activeLeafId: null,
        open: true,
        onSelect() {},
        onClose() {},
      }),
    ),
  );

  assert.match(html, /No messages to roll back to yet/);
});

test("does not render when closed", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      I18nProvider,
      null,
      React.createElement(RollbackPicker, {
        entries: [],
        activeLeafId: null,
        open: false,
        onSelect() {},
        onClose() {},
      }),
    ),
  );

  assert.equal(html, "");
});
