const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

class TodoStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = {};
    this.load();
  }

  load() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

    if (!fs.existsSync(this.filePath)) {
      return;
    }

    try {
      this.data = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
    } catch (error) {
      throw new Error(`Could not read todo data at ${this.filePath}: ${error.message}`);
    }
  }

  save() {
    const temporaryPath = `${this.filePath}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(this.data, null, 2));
    fs.renameSync(temporaryPath, this.filePath);
  }

  list(guildId) {
    return this.data[guildId] ?? [];
  }

  add(guildId, text, userId) {
    const todos = this.list(guildId);
    const todo = {
      id: randomUUID(),
      text,
      completed: false,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };

    this.data[guildId] = [...todos, todo];
    this.save();
    return todo;
  }

  complete(guildId, number) {
    const todo = this.getByNumber(guildId, number);
    todo.completed = true;
    todo.completedAt = new Date().toISOString();
    this.save();
    return todo;
  }

  remove(guildId, number) {
    const todos = this.list(guildId);
    this.assertNumber(todos, number);
    const [removed] = todos.splice(number - 1, 1);
    this.data[guildId] = todos;
    this.save();
    return removed;
  }

  clearCompleted(guildId) {
    const todos = this.list(guildId);
    const remaining = todos.filter((todo) => !todo.completed);
    const removedCount = todos.length - remaining.length;
    this.data[guildId] = remaining;

    if (removedCount > 0) {
      this.save();
    }

    return removedCount;
  }

  getByNumber(guildId, number) {
    const todos = this.list(guildId);
    this.assertNumber(todos, number);
    return todos[number - 1];
  }

  assertNumber(todos, number) {
    if (!Number.isInteger(number) || number < 1 || number > todos.length) {
      throw new RangeError(`Choose a number from 1 to ${todos.length || 0}.`);
    }
  }
}

module.exports = { TodoStore };
