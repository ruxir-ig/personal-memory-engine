"use client";

import { Check, Circle, Loader2, Plus, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { useAddTodoMutation, useAgentTools, useTodos, useUpdateTodoMutation } from "@/client/hooks";
import { EmptyState } from "./empty-state";

export function ListsBoard() {
  const todos = useTodos();
  const agentTools = useAgentTools();
  const addTodo = useAddTodoMutation();
  const updateTodo = useUpdateTodoMutation();

  const [todoTitle, setTodoTitle] = useState("");
  const visibleTodos = useMemo(() => {
    return todos.data ?? [];
  }, [todos.data]);

  async function submitTodo() {
    const title = todoTitle.trim();
    if (!title) return;
    await addTodo.mutateAsync({ title, listTitle: "Inbox" });
    setTodoTitle("");
  }

  return (
    <div className="settings-grid">
      <section className="card pad-lg">
        <div className="section-head">
          <div className="block-title">
            <span className="ic">
              <Wrench size={16} />
            </span>
            Agent tools
          </div>
        </div>
        {agentTools.isLoading ? (
          <span className="chip">
            <Loader2 size={13} className="spin" /> Loading
          </span>
        ) : agentTools.data?.length ? (
          <div className="list">
            {agentTools.data.map((tool) => (
              <div className="lrow tool-row" key={tool.id}>
                <Wrench size={15} className="faint" />
                <div className="lrow-main">
                  <strong>{tool.name}</strong>
                  <span>{tool.summary}</span>
                </div>
                <span className={tool.enabled ? "chip accent" : "chip"}>{tool.enabled ? "enabled" : "off"}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="faint" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
            No saved agent tools yet.
          </p>
        )}
      </section>

      <section className="stack">
        <div className="row between top">
          <div>
            <div className="kicker" style={{ marginBottom: 8 }}>
              Tasks
            </div>
            <h2 style={{ fontSize: 22 }}>Inbox</h2>
          </div>
        </div>

        <form
          className="ask-input-row"
          onSubmit={(event) => {
            event.preventDefault();
            void submitTodo();
          }}
        >
          <input className="input grow" value={todoTitle} onChange={(event) => setTodoTitle(event.target.value)} placeholder="Add a task..." aria-label="Task title" />
          <button className="btn" type="submit" disabled={!todoTitle.trim() || addTodo.isPending}>
            {addTodo.isPending ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
            Add
          </button>
        </form>

        {todos.isLoading ? (
          <span className="chip">
            <Loader2 size={13} className="spin" /> Loading
          </span>
        ) : visibleTodos.length ? (
          <div className="list">
            {visibleTodos.map((todo) => (
              <div className="lrow todo-row" key={todo.id} data-status={todo.status}>
                <button
                  className="icon-btn sm"
                  type="button"
                  title={todo.status === "done" ? "Mark open" : "Mark done"}
                  aria-label={todo.status === "done" ? "Mark open" : "Mark done"}
                  disabled={updateTodo.isPending}
                  onClick={() => updateTodo.mutate({ itemId: todo.id, status: todo.status === "done" ? "open" : "done" })}
                >
                  {todo.status === "done" ? <Check size={14} /> : <Circle size={14} />}
                </button>
                <div className="lrow-main">
                  <strong>{todo.title}</strong>
                  <span>{todo.notes || [todo.priority, todo.tags.join(", ")].filter(Boolean).join(" · ")}</span>
                </div>
                <span className={todo.status === "open" ? "chip accent" : "chip"}>{todo.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No tasks yet" icon={<Circle size={20} />}>
            Add one here, or ask Quipu from chat.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
