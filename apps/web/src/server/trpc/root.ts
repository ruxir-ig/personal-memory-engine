import { z } from "zod";
import {
  captureInputSchema,
  chatInputSchema,
  preferenceInputSchema,
  providerInputSchema,
  reminderInputSchema,
  searchInputSchema,
} from "@pme/shared";
import {
  askMemory,
  captureText,
  confirmIntent,
  createReminder,
  exportAllData,
  getArtifactById,
  getDashboardSnapshot,
  listInbox,
  listPreferences,
  listProviders,
  listReminders,
  listRuns,
  listTimeline,
  querySearch,
  updatePreference,
  upsertProvider,
} from "@/server/data/repository";
import { createTRPCRouter, publicProcedure } from "./init";

export const appRouter = createTRPCRouter({
  dashboard: createTRPCRouter({
    snapshot: publicProcedure.query(() => getDashboardSnapshot()),
  }),
  memory: createTRPCRouter({
    capture: publicProcedure.input(captureInputSchema).mutation(({ input }) => captureText(input)),
    confirmIntent: publicProcedure
      .input(z.object({ intentId: z.string(), accepted: z.boolean() }))
      .mutation(({ input }) => confirmIntent(input.intentId, input.accepted)),
  }),
  artifact: createTRPCRouter({
    byId: publicProcedure.input(z.object({ id: z.string() })).query(({ input }) => getArtifactById(input.id)),
  }),
  search: createTRPCRouter({
    query: publicProcedure.input(searchInputSchema).query(({ input }) => querySearch(input)),
  }),
  timeline: createTRPCRouter({
    query: publicProcedure.query(() => listTimeline()),
  }),
  inbox: createTRPCRouter({
    list: publicProcedure.query(() => listInbox()),
  }),
  reminder: createTRPCRouter({
    list: publicProcedure.query(() => listReminders()),
    create: publicProcedure.input(reminderInputSchema).mutation(({ input }) => createReminder(input)),
  }),
  preference: createTRPCRouter({
    list: publicProcedure.query(() => listPreferences()),
    update: publicProcedure.input(preferenceInputSchema).mutation(({ input }) => updatePreference(input)),
  }),
  provider: createTRPCRouter({
    list: publicProcedure.query(() => listProviders()),
    upsert: publicProcedure.input(providerInputSchema).mutation(({ input }) => upsertProvider(input)),
  }),
  chat: createTRPCRouter({
    ask: publicProcedure.input(chatInputSchema).mutation(({ input }) => askMemory(input)),
  }),
  run: createTRPCRouter({
    list: publicProcedure.query(() => listRuns()),
  }),
  export: createTRPCRouter({
    all: publicProcedure.query(() => exportAllData()),
  }),
});

export type AppRouter = typeof appRouter;
