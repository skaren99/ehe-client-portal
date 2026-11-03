import test from "node:test";
import assert from "node:assert/strict";
import { summary, mayComplete } from "../src/domain.mjs";
test("completion totals include every status and empty projects", () => {
  assert.deepEqual(summary([]), { total: 0, done: 0, open: 0 });
  assert.deepEqual(
    summary([{ status: "Valmis" }, { status: "Töös" }, { status: "Ootel" }]),
    { total: 3, done: 1, open: 2 },
  );
});
test("client task controls distinguish planner responsibilities", () => {
  assert.equal(mayComplete({ group: "planner" }, false), false);
  assert.equal(mayComplete({ group: "couple" }, false), true);
  assert.equal(mayComplete({ group: "planner" }, true), true);
});
