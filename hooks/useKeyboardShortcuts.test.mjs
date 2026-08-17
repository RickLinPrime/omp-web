import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { tsconfigPaths: true });
const { isAbortHandlerRegistered, registerAbortHandler } = await jiti.import("./useKeyboardShortcuts.ts");

test("global abort handler registry reflects registration state", () => {
  assert.equal(isAbortHandlerRegistered(), false);
  const abort = () => {};
  registerAbortHandler(abort);
  assert.equal(isAbortHandlerRegistered(), true);
  registerAbortHandler(null);
  assert.equal(isAbortHandlerRegistered(), false);
});
