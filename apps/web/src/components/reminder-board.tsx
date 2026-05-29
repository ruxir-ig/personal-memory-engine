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
      await Promise.all([utils.reminder.list.invalidate(), utils.dashboard.snapshot.invalidate(), utils.canvas.layout.invalidate()]);
    },
  });
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");

  async function requestNotifications() {
    if (!("Notification" in window)) {
      setNotificationMessage("This browser does not support notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationMessage(`Notifications: ${permission}`);
    if (permission === "granted") new Notification("Quipo", { body: "Reminder notifications are on." });
  }

  async function submitReminder() {
    if (!title.trim() || !dueAt) return;
    await create.mutateAsync({ title, dueAt: new Date(dueAt).toISOString(), sourceText: title, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  }

  return (
    <div className="settings-grid">
      <section className="card pad-lg">
        <div className="section-head">
          <div className="block-title">
            <span className="ic">
              <CalendarPlus size={16} />
            </span>
            New reminder
          </div>
          <button className="icon-btn" type="button" title="Enable notifications" aria-label="Enable notifications" onClick={requestNotifications}>
            <Bell size={16} />
          </button>
        </div>
        <div className="stack">
          <label className="field">
            <span>Title</span>
            <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Follow up with..." />
          </label>
          <label className="field">
            <span>Due</span>
            <input className="input" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
          </label>
          <button className="btn" type="button" onClick={submitReminder} disabled={!title.trim() || !dueAt || create.isPending}>
            {create.isPending ? <Loader2 size={16} className="spin" /> : <CalendarPlus size={16} />}
            Schedule
          </button>
          {notificationMessage ? <span className="faint" style={{ fontSize: 12 }}>{notificationMessage}</span> : null}
        </div>
      </section>

      <section>
        <div className="kicker" style={{ marginBottom: 12 }}>
          Scheduled
        </div>
        {reminders.isLoading ? (
          <span className="chip">
            <Loader2 size={13} className="spin" /> Loading
          </span>
        ) : reminders.data?.length ? (
          <div className="list">
            {reminders.data.map((reminder) => (
              <div className="lrow" key={reminder.id}>
                <span className="when">{formatDateTime(reminder.dueAt).split(",")[0]}</span>
                <div className="lrow-main">
                  <strong>{reminder.title}</strong>
                  <span>{formatDateTime(reminder.dueAt)}</span>
                </div>
                <span className={reminder.status === "scheduled" ? "chip accent" : "chip"}>{reminder.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No reminders yet" icon={<Bell size={20} />}>
            Schedule one here, or confirm a reminder Quipo detects from something you dump.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
