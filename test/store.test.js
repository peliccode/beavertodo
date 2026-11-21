const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { TodoStore } = require("../src/store");

test("adds, completes, removes, and persists todos", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "todo-bot-"));
  const file = path.join(directory, "todos.json");
  const store = new TodoStore(file);

  store.add("guild-1", "Write tests", "user-1");
  store.add("guild-1", "Ship bot", "user-1");
  assert.equal(store.list("guild-1").length, 2);

  store.complete("guild-1", 1);
  assert.equal(store.list("guild-1")[0].completed, true);

  const removed = store.remove("guild-1", 2);
  assert.equal(removed.text, "Ship bot");

  const reloaded = new TodoStore(file);
  assert.equal(reloaded.list("guild-1").length, 1);
  assert.equal(reloaded.list("guild-1")[0].completed, true);

  fs.rmSync(directory, { recursive: true, force: true });
});

test("rejects invalid todo numbers", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "todo-bot-"));
  const store = new TodoStore(path.join(directory, "todos.json"));

  assert.throws(() => store.complete("guild-1", 1), RangeError);
  assert.throws(() => store.remove("guild-1", 0), RangeError);

  fs.rmSync(directory, { recursive: true, force: true });
});
