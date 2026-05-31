import { z } from "zod";
import { captureInputSchema, chatInputSchema, preferenceInputSchema, providerInputSchema, reminderInputSchema, searchInputSchema } from "@pme/shared";
import {
  askMemory,
  captureText,
  confirmIntent,
  createReminder,
  deleteProvider,
  exportAllData,
  getArtifactById,
  getCanvasLayout,
  getDashboardSnapshot,
  getSpaceBySlug,
  listInbox,
  listPreferences,
  listProviders,
  listReminders,
  listRuns,
  listSpaces,
  listTimeline,
  querySearch,
  setItemFlags,
  updatePreference,
  upsertProvider,
} from "@/server/data/repository";
import { createTRPCRouter, publicProcedure } from "./init";

export const appRouter = createTRPCRouter({
  dashboard: createTRPCRouter({
    snapshot: publicProcedure.query(() => getDashboardSnapshot()),
  }),
  canvas: createTRPCRouter({
    layout: publicProcedure.input(z.object({ clientNow: z.string().optional() }).optional()).query(({ input }) => getCanvasLayout(input?.clientNow)),
  }),
  memory: createTRPCRouter({
    capture: publicProcedure.input(captureInputSchema).mutation(({ input }) => captureText(input)),
    confirmIntent: publicProcedure.input(z.object({ intentId: z.string(), accepted: z.boolean() })).mutation(({ input }) => confirmIntent(input.intentId, input.accepted)),
    setFlags: publicProcedure
      .input(z.object({ id: z.string(), pinned: z.boolean().optional(), archived: z.boolean().optional() }))
      .mutation(({ input }) => setItemFlags(input)),
  }),
  space: createTRPCRouter({
    list: publicProcedure.query(() => listSpaces()),
    bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(({ input }) => getSpaceBySlug(input.slug)),
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
    delete: publicProcedure.input(z.object({ id: z.string() })).mutation(({ input }) => deleteProvider(input.id)),
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
