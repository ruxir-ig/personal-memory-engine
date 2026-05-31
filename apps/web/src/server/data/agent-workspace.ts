import { randomUUID } from "node:crypto";
import type { AgentToolRecord, TodoItem, TodoList, TodoPriority, TodoStatus } from "@pme/shared";
import { now, readData, writeData } from "./store";

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "tool"
  );
}

function normalizeTitle(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function findList(lists: TodoList[], args: { listId?: string; listTitle?: string }) {
  if (args.listId) return lists.find((list) => list.id === args.listId);
  const wanted = normalizeTitle(args.listTitle || "Inbox").toLowerCase();
  return lists.find((list) => list.title.toLowerCase() === wanted && !list.archived);
}

function summarizeList(list: TodoList, todos: TodoItem[]) {
  const items = todos.filter((todo) => todo.listId === list.id);
  return {
    id: list.id,
    title: list.title,
    description: list.description,
    archived: Boolean(list.archived),
    counts: {
      open: items.filter((todo) => todo.status === "open").length,
      done: items.filter((todo) => todo.status === "done").length,
      cancelled: items.filter((todo) => todo.status === "cancelled").length,
    },
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
  };
}

function publicTodo(todo: TodoItem, list?: TodoList) {
  return {
    id: todo.id,
    listId: todo.listId,
    listTitle: list?.title,
    title: todo.title,
    notes: todo.notes,
    status: todo.status,
    priority: todo.priority,
    dueAt: todo.dueAt,
    tags: todo.tags,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
    completedAt: todo.completedAt,
  };
}

export async function listTodoLists() {
  const data = await readData();
  return data.todoLists.map((list) => summarizeList(list, data.todos)).sort((a, b) => a.title.localeCompare(b.title));
}

export async function listTodos(args: { listId?: string; listTitle?: string; status?: TodoStatus | "all"; includeArchivedLists?: boolean } = {}) {
  const data = await readData();
  const list = findList(data.todoLists, args);
  const listIds = list ? new Set([list.id]) : new Set(data.todoLists.filter((candidate) => args.includeArchivedLists || !candidate.archived).map((candidate) => candidate.id));
  const listsById = new Map(data.todoLists.map((candidate) => [candidate.id, candidate]));
  return data.todos
    .filter((todo) => listIds.has(todo.listId))
    .filter((todo) => !args.status || args.status === "all" || todo.status === args.status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((todo) => publicTodo(todo, listsById.get(todo.listId)));
}

export async function upsertTodoList(args: { title: string; description?: string; color?: string }) {
  const data = await readData();
  const title = normalizeTitle(args.title);
  const existing = findList(data.todoLists, { listTitle: title });
  if (existing) {
    existing.description = args.description ?? existing.description;
    existing.color = args.color ?? existing.color;
    existing.archived = false;
    existing.updatedAt = now();
    await writeData(data);
    return summarizeList(existing, data.todos);
  }
  const timestamp = now();
  const list: TodoList = { id: randomUUID(), title, description: args.description?.trim() || undefined, color: args.color?.trim() || undefined, createdAt: timestamp, updatedAt: timestamp };
  data.todoLists.push(list);
  await writeData(data);
  return summarizeList(list, data.todos);
}

async function ensureTodoList(data: Awaited<ReturnType<typeof readData>>, args: { listId?: string; listTitle?: string }) {
  const existing = findList(data.todoLists, args);
  if (existing) return existing;
  const timestamp = now();
  const list: TodoList = { id: randomUUID(), title: normalizeTitle(args.listTitle || "Inbox"), createdAt: timestamp, updatedAt: timestamp };
  data.todoLists.push(list);
  return list;
}

export async function addTodoItem(args: { title: string; listId?: string; listTitle?: string; notes?: string; priority?: TodoPriority; dueAt?: string; tags?: string[] }) {
  const data = await readData();
  const list = await ensureTodoList(data, args);
  const timestamp = now();
  const todo: TodoItem = {
    id: randomUUID(),
    listId: list.id,
    title: normalizeTitle(args.title),
    notes: args.notes?.trim() || undefined,
    status: "open",
    priority: args.priority ?? "normal",
    dueAt: args.dueAt,
    tags: Array.from(new Set((args.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean))).slice(0, 8),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  data.todos.push(todo);
  list.updatedAt = timestamp;
  await writeData(data);
  return publicTodo(todo, list);
}

export async function updateTodoItem(args: { itemId: string; title?: string; notes?: string; status?: TodoStatus; priority?: TodoPriority; dueAt?: string | null; tags?: string[] }) {
  const data = await readData();
  const todo = data.todos.find((item) => item.id === args.itemId);
  if (!todo) throw new Error("Todo item not found");
  if (args.title !== undefined) todo.title = normalizeTitle(args.title);
  if (args.notes !== undefined) todo.notes = args.notes.trim() || undefined;
  if (args.status !== undefined) {
    todo.status = args.status;
    todo.completedAt = args.status === "done" ? now() : undefined;
  }
  if (args.priority !== undefined) todo.priority = args.priority;
  if (args.dueAt !== undefined) todo.dueAt = args.dueAt || undefined;
  if (args.tags !== undefined) todo.tags = Array.from(new Set(args.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))).slice(0, 8);
  todo.updatedAt = now();
  const list = data.todoLists.find((candidate) => candidate.id === todo.listId);
  if (list) list.updatedAt = todo.updatedAt;
  await writeData(data);
  return publicTodo(todo, list);
}

export async function listAgentTools() {
  const data = await readData();
  return data.agentTools.slice().sort((a, b) => a.name.localeCompare(b.name));
}

export async function listEnabledAgentToolManifests() {
  const tools = await listAgentTools();
  return tools.filter((tool) => tool.enabled).map(({ slug, name, summary, whenToUse, inputSchema }) => ({ slug, name, summary, whenToUse, inputSchema }));
}

export async function upsertAgentTool(args: { toolId?: string; name: string; summary: string; whenToUse: string; instructions: string; inputSchema?: Record<string, unknown>; enabled?: boolean }) {
  const data = await readData();
  const timestamp = now();
  const name = normalizeTitle(args.name);
  const existing = args.toolId ? data.agentTools.find((tool) => tool.id === args.toolId) : data.agentTools.find((tool) => tool.slug === slugify(name));
  if (existing) {
    Object.assign(existing, { name, summary: args.summary.trim(), whenToUse: args.whenToUse.trim(), instructions: args.instructions.trim(), inputSchema: args.inputSchema ?? existing.inputSchema, enabled: args.enabled ?? existing.enabled, updatedAt: timestamp });
    await writeData(data);
    return existing;
  }
  const tool: AgentToolRecord = {
    id: randomUUID(),
    slug: slugify(name),
    name,
    summary: args.summary.trim(),
    whenToUse: args.whenToUse.trim(),
    instructions: args.instructions.trim(),
    inputSchema: args.inputSchema ?? { type: "object", additionalProperties: true },
    enabled: args.enabled ?? true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  data.agentTools.push(tool);
  await writeData(data);
  return tool;
}

export async function setAgentToolEnabled(args: { toolId?: string; slug?: string; enabled: boolean }) {
  const data = await readData();
  const tool = data.agentTools.find((candidate) => candidate.id === args.toolId || candidate.slug === args.slug);
  if (!tool) throw new Error("Agent tool not found");
  tool.enabled = args.enabled;
  tool.updatedAt = now();
  await writeData(data);
  return tool;
}

export async function getAgentToolForRun(args: { toolId?: string; slug?: string; input?: Record<string, unknown> }) {
  const data = await readData();
  const tool = data.agentTools.find((candidate) => candidate.enabled && (candidate.id === args.toolId || candidate.slug === args.slug));
  if (!tool) throw new Error("Agent tool not found or disabled");
  return { id: tool.id, slug: tool.slug, name: tool.name, summary: tool.summary, instructions: tool.instructions, inputSchema: tool.inputSchema, input: args.input ?? {} };
}
