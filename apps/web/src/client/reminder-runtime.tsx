"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useReminders } from "@/client/hooks";
import { processDueReminder } from "@/client/memory/repository";

const POLL_MS = 30_000;

function notificationAvailable() {
  return typeof window !== "undefined" && "Notification" in window;
}

function nextDelay(reminders: NonNullable<ReturnType<typeof useReminders>["data"]>) {
  const now = Date.now();
  const nextDue = reminders
    .filter((reminder) => reminder.status === "scheduled" && !reminder.notifiedAt)
    .map((reminder) => new Date(reminder.dueAt).getTime())
    .filter((time) => Number.isFinite(time) && time > now)
    .sort((a, b) => a - b)[0];
  if (!nextDue) return POLL_MS;
  return Math.min(POLL_MS, Math.max(1_000, nextDue - now));
}

function afterPaint() {
  return new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

export function ReminderRuntime() {
  const reminders = useReminders();
  const queryClient = useQueryClient();
  const processing = useRef(new Set<string>());
  const mounted = useRef(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!reminders.data?.length) return;

    async function processReadyReminders() {
      const due = reminders.data!.filter((reminder) => {
        if (reminder.status !== "scheduled" || reminder.notifiedAt || processing.current.has(reminder.id)) return false;
        const dueAt = new Date(reminder.dueAt).getTime();
        return Number.isFinite(dueAt) && dueAt <= Date.now();
      });

      for (const reminder of due) {
        processing.current.add(reminder.id);
        try {
          const result = await processDueReminder({
            reminderId: reminder.id,
            clientNow: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          });
          await queryClient.invalidateQueries({ queryKey: ["memory"] });
          if (mounted.current) await afterPaint();
          if (mounted.current && notificationAvailable() && Notification.permission === "granted") {
            new Notification(result.notification.title, { body: result.notification.body });
          }
        } catch {
          processing.current.delete(reminder.id);
        }
      }
    }

    void processReadyReminders();
  }, [queryClient, reminders.data, tick]);

  useEffect(() => {
    if (!reminders.data?.length) return;
    const timeout = window.setTimeout(() => {
      setTick((value) => value + 1);
      void reminders.refetch();
    }, nextDelay(reminders.data));
    return () => window.clearTimeout(timeout);
  }, [reminders.data, reminders.refetch, tick]);

  return null;
}
