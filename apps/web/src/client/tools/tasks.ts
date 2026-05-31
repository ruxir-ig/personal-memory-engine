import { addTodoItem, deleteTodoItems, listTodos, updateTodoItem } from "@/client/memory/agent-workspace";
import type { TaskToolArgs, ToolContext, ToolResult } from "./types";

export async function runTasksTool(args: TaskToolArgs, _context: ToolContext): Promise<ToolResult> {
  try {
    if (args.action === "list") {
      const status = args.status === "all" ? "all" : args.status;
      const todos = await listTodos({ listId: args.listId, listTitle: args.listTitle, status, includeArchivedLists: args.includeArchivedLists });
      const filtered = args.query
        ? todos.filter((todo) => [todo.id, todo.title, todo.notes, todo.status, todo.priority, todo.tags.join(" "), todo.listTitle].filter(Boolean).join(" ").toLowerCase().includes(args.query!.toLowerCase()))
        : todos;
      return { toolId: "tasks", ok: true, summary: `Found ${filtered.length} task${filtered.length === 1 ? "" : "s"}.`, data: { tasks: filtered } };
    }

    if (args.action === "create") {
      if (args.items.length > 0) {
        const todos = [];
        for (const item of args.items) {
          todos.push(
            await addTodoItem({
              title: item.title,
              listId: args.listId,
              listTitle: args.listTitle,
              notes: item.notes,
              priority: item.priority,
              dueAt: item.dueAt,
              tags: item.tags,
            }),
          );
        }
        return {
          toolId: "tasks",
          ok: true,
          summary: `Added ${todos.length} task${todos.length === 1 ? "" : "s"}.`,
          data: { tasks: todos },
        };
      }
      if (!args.title) throw new Error("Provide title or items");
      const todo = await addTodoItem({
        title: args.title,
        listId: args.listId,
        listTitle: args.listTitle,
        notes: args.notes,
        priority: args.priority,
        dueAt: args.dueAt,
        tags: args.tags,
      });
      return { toolId: "tasks", ok: true, summary: `Added task: ${todo.title}.`, data: { task: todo } };
    }

    if (args.action === "update") {
      let itemId = args.itemId;
      if (!itemId && args.query) {
        const matches = await listTodos({ listId: args.listId, listTitle: args.listTitle, status: args.status === "all" ? "all" : args.status, includeArchivedLists: args.includeArchivedLists });
        const lowered = args.query.toLowerCase();
        const filtered = matches.filter((todo) => [todo.id, todo.title, todo.notes, todo.status, todo.priority, todo.tags.join(" "), todo.listTitle].filter(Boolean).join(" ").toLowerCase().includes(lowered));
        if (filtered.length !== 1) throw new Error(`Matched ${filtered.length} tasks. Be more specific before updating.`);
        itemId = filtered[0]!.id;
      }
      if (!itemId) throw new Error("Provide itemId or a query that matches one task");
      const todo = await updateTodoItem({
        itemId,
        title: args.title,
        notes: args.notes,
        status: args.status === "all" ? undefined : args.status,
        priority: args.priority,
        dueAt: args.dueAt,
        tags: args.tags,
      });
      return { toolId: "tasks", ok: true, summary: `Updated task: ${todo.title}.`, data: { task: todo } };
    }

    if (args.action === "delete") {
      const deleted = await deleteTodoItems({
        itemId: args.itemId,
        query: args.query,
        listId: args.listId,
        listTitle: args.listTitle,
        status: args.status === "all" ? "all" : args.status,
        includeArchivedLists: args.includeArchivedLists,
        maxCount: args.maxCount,
      });
      return { toolId: "tasks", ok: true, summary: `Deleted ${deleted.length} task${deleted.length === 1 ? "" : "s"}.`, data: { deleted } };
    }

    return { toolId: "tasks", ok: false, summary: `Unsupported task action: ${args.action}.`, data: { args } };
  } catch (error) {
    return {
      toolId: "tasks",
      ok: false,
      summary: "Task tool failed.",
      data: { args },
      error: error instanceof Error ? error.message : "Unknown task tool error",
    };
  }
}
