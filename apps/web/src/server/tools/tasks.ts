import { addTodoItem, listTodoLists, listTodos, updateTodoItem, upsertTodoList } from "@/server/data/agent-workspace";
import type { TaskToolArgs, ToolContext, ToolResult } from "./types";

export async function runTasksTool(args: TaskToolArgs, _context: ToolContext): Promise<ToolResult> {
  try {
    if (args.action === "list_lists") {
      const lists = await listTodoLists();
      return { toolId: "tasks", ok: true, summary: `Found ${lists.length} todo list${lists.length === 1 ? "" : "s"}.`, data: { lists } };
    }
    if (args.action === "create_list") {
      if (!args.listTitle && !args.title) throw new Error("Provide listTitle or title");
      const list = await upsertTodoList({ title: args.listTitle ?? args.title!, description: args.notes });
      return { toolId: "tasks", ok: true, summary: `Ready todo list: ${list.title}.`, data: { list } };
    }
    if (args.action === "list_items") {
      const status = args.status === "all" ? "all" : args.status;
      const todos = await listTodos({ listId: args.listId, listTitle: args.listTitle, status, includeArchivedLists: args.includeArchivedLists });
      return { toolId: "tasks", ok: true, summary: `Found ${todos.length} todo item${todos.length === 1 ? "" : "s"}.`, data: { todos } };
    }
    if (args.action === "add_item") {
      if (!args.title) throw new Error("Provide title");
      const todo = await addTodoItem({ title: args.title, listId: args.listId, listTitle: args.listTitle, notes: args.notes, priority: args.priority, dueAt: args.dueAt, tags: args.tags });
      return { toolId: "tasks", ok: true, summary: `Added todo: ${todo.title}.`, data: { todo } };
    }
    if (args.action === "update_item") {
      if (!args.itemId) throw new Error("Provide itemId");
      const todo = await updateTodoItem({ itemId: args.itemId, title: args.title, notes: args.notes, status: args.status === "all" ? undefined : args.status, priority: args.priority, dueAt: args.dueAt, tags: args.tags });
      return { toolId: "tasks", ok: true, summary: `Updated todo: ${todo.title}.`, data: { todo } };
    }
    return { toolId: "tasks", ok: false, summary: `Unsupported task action: ${args.action}.`, data: { args } };
  } catch (error) {
    return { toolId: "tasks", ok: false, summary: "Task tool failed.", data: { args }, error: error instanceof Error ? error.message : "Unknown task tool error" };
  }
}
