"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CaptureInput, ChatInput, PreferenceInput, ProviderInput, ReminderInput, SearchInput } from "@pme/shared";
import {
  askMemory,
  captureText,
  confirmIntent,
  createReminder,
  deleteProvider,
  enrichCanvasLayoutWithAi,
  getArtifactById,
  getCanvasLayout,
  getDashboardSnapshot,
  layoutFromSnapshot,
  getSpaceBySlug,
  importFileArtifact,
  addTodoItem,
  listAgentTools,
  listPreferences,
  listProviders,
  listReminders,
  listSpaces,
  listTodoLists,
  listTodos,
  processDueReminder,
  listTimeline,
  querySearch,
  resetDemoStore,
  updateTodoItem,
  updatePreference,
  upsertProvider,
  upsertTodoList,
} from "@/client/memory/repository";
import { useMemoryReady } from "@/client/memory-provider";

export const memoryKeys = {
  dashboard: ["memory", "dashboard"] as const,
  canvas: (clientNow?: string) => ["memory", "canvas", clientNow ?? ""] as const,
  spaces: ["memory", "spaces"] as const,
  space: (slug: string) => ["memory", "space", slug] as const,
  artifact: (id: string) => ["memory", "artifact", id] as const,
  search: (input: SearchInput) => ["memory", "search", input] as const,
  timeline: ["memory", "timeline"] as const,
  reminders: ["memory", "reminders"] as const,
  preferences: ["memory", "preferences"] as const,
  providers: ["memory", "providers"] as const,
  todoLists: ["memory", "todoLists"] as const,
  todos: ["memory", "todos"] as const,
  agentTools: ["memory", "agentTools"] as const,
};

export function useInvalidateMemory() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: ["memory"] });
  };
}

export function useDashboardSnapshot() {
  const ready = useMemoryReady();
  return useQuery({ queryKey: memoryKeys.dashboard, queryFn: getDashboardSnapshot, enabled: ready });
}

export function useCanvasLayout(clientNow?: string) {
  const ready = useMemoryReady();
  const dashboard = useDashboardSnapshot();
  const instant = useMemo(
    () => (dashboard.data ? layoutFromSnapshot(dashboard.data, clientNow) : undefined),
    [dashboard.data, clientNow],
  );
  return useQuery({
    queryKey: memoryKeys.canvas(clientNow),
    queryFn: () => getCanvasLayout(clientNow),
    enabled: ready,
    placeholderData: instant,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useSpaces() {
  const ready = useMemoryReady();
  return useQuery({ queryKey: memoryKeys.spaces, queryFn: listSpaces, enabled: ready });
}

export function useSpaceBySlug(slug: string) {
  const ready = useMemoryReady();
  return useQuery({ queryKey: memoryKeys.space(slug), queryFn: () => getSpaceBySlug(slug), enabled: ready && Boolean(slug) });
}

export function useArtifactById(id: string) {
  const ready = useMemoryReady();
  return useQuery({ queryKey: memoryKeys.artifact(id), queryFn: () => getArtifactById(id), enabled: ready && Boolean(id) });
}

export function useSearch(input: SearchInput) {
  const ready = useMemoryReady();
  return useQuery({ queryKey: memoryKeys.search(input), queryFn: () => querySearch(input), enabled: ready });
}

export function useTimeline() {
  const ready = useMemoryReady();
  return useQuery({ queryKey: memoryKeys.timeline, queryFn: listTimeline, enabled: ready });
}

export function useReminders() {
  const ready = useMemoryReady();
  return useQuery({ queryKey: memoryKeys.reminders, queryFn: listReminders, enabled: ready });
}

export function usePreferences() {
  const ready = useMemoryReady();
  return useQuery({ queryKey: memoryKeys.preferences, queryFn: listPreferences, enabled: ready });
}

export function useProviders() {
  const ready = useMemoryReady();
  return useQuery({ queryKey: memoryKeys.providers, queryFn: listProviders, enabled: ready });
}

export function useTodoLists() {
  const ready = useMemoryReady();
  return useQuery({ queryKey: memoryKeys.todoLists, queryFn: listTodoLists, enabled: ready });
}

export function useTodos() {
  const ready = useMemoryReady();
  return useQuery({ queryKey: memoryKeys.todos, queryFn: () => listTodos({ status: "all" }), enabled: ready });
}

export function useAgentTools() {
  const ready = useMemoryReady();
  return useQuery({ queryKey: memoryKeys.agentTools, queryFn: listAgentTools, enabled: ready });
}

export function useCaptureMutation() {
  const invalidate = useInvalidateMemory();
  return useMutation({
    mutationFn: (input: CaptureInput) => captureText(input),
    onSuccess: async (_data, variables) => {
      await invalidate();
      void enrichCanvasLayoutWithAi(variables.clientNow).then(() => invalidate());
    },
  });
}

export function useAskMutation() {
  const invalidate = useInvalidateMemory();
  return useMutation({ mutationFn: (input: ChatInput) => askMemory(input), onSuccess: () => invalidate() });
}

export function useConfirmIntentMutation() {
  const invalidate = useInvalidateMemory();
  return useMutation({
    mutationFn: (input: { intentId: string; accepted: boolean }) => confirmIntent(input.intentId, input.accepted),
    onSuccess: () => invalidate(),
  });
}

export function useCreateReminderMutation() {
  const invalidate = useInvalidateMemory();
  return useMutation({
    mutationFn: (input: ReminderInput) => createReminder(input),
    onSuccess: () => invalidate(),
  });
}

export function useProcessDueReminderMutation() {
  const invalidate = useInvalidateMemory();
  return useMutation({
    mutationFn: (input: { reminderId: string; clientNow?: string; timezone?: string }) => processDueReminder(input),
    onSuccess: () => invalidate(),
  });
}

export function useCreateTodoListMutation() {
  const invalidate = useInvalidateMemory();
  return useMutation({
    mutationFn: (input: { title: string; description?: string }) => upsertTodoList(input),
    onSuccess: () => invalidate(),
  });
}

export function useAddTodoMutation() {
  const invalidate = useInvalidateMemory();
  return useMutation({
    mutationFn: (input: { title: string; listId?: string; listTitle?: string; notes?: string; priority?: "low" | "normal" | "high"; dueAt?: string; tags?: string[] }) => addTodoItem(input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateTodoMutation() {
  const invalidate = useInvalidateMemory();
  return useMutation({
    mutationFn: (input: { itemId: string; title?: string; notes?: string; status?: "open" | "done" | "cancelled"; priority?: "low" | "normal" | "high"; dueAt?: string | null; tags?: string[] }) => updateTodoItem(input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdatePreferenceMutation() {
  const invalidate = useInvalidateMemory();
  return useMutation({
    mutationFn: (input: PreferenceInput) => updatePreference(input),
    onSuccess: () => invalidate(),
  });
}

export function useUpsertProviderMutation() {
  const invalidate = useInvalidateMemory();
  return useMutation({
    mutationFn: (input: ProviderInput) => upsertProvider(input),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteProviderMutation() {
  const invalidate = useInvalidateMemory();
  return useMutation({
    mutationFn: (id: string) => deleteProvider(id),
    onSuccess: () => invalidate(),
  });
}

export function useImportFileMutation() {
  const invalidate = useInvalidateMemory();
  return useMutation({
    mutationFn: (file: File) =>
      file.arrayBuffer().then((buffer) =>
        importFileArtifact({
          filename: file.name || "upload.bin",
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          buffer,
        }),
      ),
    onSuccess: () => invalidate(),
  });
}

export function useResetDemoMutation() {
  const invalidate = useInvalidateMemory();
  return useMutation({
    mutationFn: () => resetDemoStore(),
    onSuccess: () => invalidate(),
  });
}
