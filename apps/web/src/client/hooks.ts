"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CaptureInput, ChatInput, PreferenceInput, ProviderInput, ReminderInput, SearchInput } from "@pme/shared";
import {
  askMemory,
  captureText,
  confirmIntent,
  createReminder,
  deleteProvider,
  getArtifactById,
  getCanvasLayout,
  getDashboardSnapshot,
  getSpaceBySlug,
  importFileArtifact,
  listPreferences,
  listProviders,
  listReminders,
  listSpaces,
  listTimeline,
  querySearch,
  resetDemoStore,
  updatePreference,
  upsertProvider,
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
  return useQuery({ queryKey: memoryKeys.canvas(clientNow), queryFn: () => getCanvasLayout(clientNow), enabled: ready });
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

export function useCaptureMutation() {
  const invalidate = useInvalidateMemory();
  return useMutation({
    mutationFn: (input: CaptureInput) => captureText(input),
    onSuccess: () => invalidate(),
  });
}

export function useAskMutation() {
  return useMutation({ mutationFn: (input: ChatInput) => askMemory(input) });
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
