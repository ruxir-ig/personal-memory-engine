"use client";

import { Bell, CalendarPlus, Loader2 } from "lucide-react";
import { useState } from "react";
import { formatDateTime } from "@/lib/utils";
import { trpc } from "@/trpc/client";
import { EmptyState } from "./empty-state";

export function ReminderBoard() {
  const utils = trpc.useUtils();
  const reminders = trpc.reminder.list.useQuery();
  const create = trpc.reminder.create.useMutation({
    onSuccess: async () => {
      setTitle("");
      setDueAt("");
      await Promise.all([utils.reminder.list.invalidate(), utils.dashboard.snapshot.invalidate()]);
    },
  });
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");

  async function requestNotifications() {
    if (!("Notification" in window)) {
      setNotificationMessage("This browser does not expose Notification permission.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationMessage(`Browser notification permission: ${permission}`);
    if (permission === "granted") {
      new Notification("Quipu", {
        body: "Browser notifications are enabled for reminder v0.",
      });
    }
  }

  async function submitReminder() {
    if (!title.trim() || !dueAt) return;
    await create.mutateAsync({
      title,
      dueAt: new Date(dueAt).toISOString(),
      sourceText: title,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }

  return (
    <div className="grid-dashboard">
      <section className="surface section-pad">
        <div className="card-title-row" style={{ marginBottom: 14 }}>
          <div>
            <div className="page-kicker">Reminder engine</div>
            <h2 className="card-title" style={{ fontSize: 20 }}>
              Browser-notification first
            </h2>
          </div>
          <button className="icon-button secondary" type="button" title="Enable notifications" onClick={requestNotifications}>
            <Bell size={17} />
          </button>
        </div>
        <div className="card-list">
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Reminder title" />
          <input
            className="input"
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
          />
          <div className="toolbar">
            <button className="button" type="button" onClick={submitReminder} disabled={!title.trim() || !dueAt || create.isPending}>
              {create.isPending ? <Loader2 size={16} /> : <CalendarPlus size={16} />}
              Schedule
            </button>
            {notificationMessage ? <span className="pill">{notificationMessage}</span> : null}
          </div>
        </div>
      </section>

      <section className="surface section-pad">
        <div className="page-kicker" style={{ marginBottom: 12 }}>
          Scheduled
        </div>
        {reminders.isLoading ? (
          <span className="pill">
            <Loader2 size={13} /> Loading reminders
          </span>
        ) : reminders.data?.length ? (
          <div className="card-list">
            {reminders.data.map((reminder) => (
              <article className="memory-card" key={reminder.id}>
                <div className="card-title-row">
                  <div>
                    <h2 className="card-title">{reminder.title}</h2>
                    <p className="card-copy">{reminder.naturalLanguageSource}</p>
                  </div>
                  <span className="pill accent">{reminder.status}</span>
                </div>
                <div className="pill-row">
                  <span className="pill">{formatDateTime(reminder.dueAt)}</span>
                  <span className="pill">{reminder.timezone}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState>No reminders scheduled yet.</EmptyState>
        )}
      </section>
    </div>
  );
}
