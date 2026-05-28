# Today Submission Plan

Date: Thursday, May 28, 2026

Goal: submit a working prototype today that clearly demonstrates Quipu as a personal memory engine with a clean Canvas and Ingest flow. Do not overbuild the final local-agent/hosted-canvas architecture today. Show the direction through the product flow.

## Product Shape For Today

Quipu has two visible modes:

1. **Canvas**
   - The quick-glance home surface.
   - Blank by default.
   - Shows real user-created items only.
   - Sections can be simple for now:
     - reminders
     - pending review
     - recent memory
     - timeline/context
   - Do not show fake or dummy data.

2. **Ingest**
   - The input surface.
   - User can paste notes, deadlines, project context, or import files.
   - The UI should feel simple and fast.
   - Avoid loudly explaining “processed locally” in the UI.
   - Local-first behavior should be implied by speed and product framing, not heavy labels.

## UI Work To Finish Today

- Keep only `Canvas` and `Ingest` in the main navigation.
- Keep Canvas clean and mostly empty until real data exists.
- Make empty Canvas feel intentional, not broken.
- On Ingest:
  - text input
  - optional source label
  - file import
  - submit/capture action
  - concise result state after capture
- After capture:
  - show that the item was saved/processed
  - show that it is available on Canvas
  - keep this subtle, for example:
    - “Saved”
    - “On Canvas”
    - small status chip
- Canvas should show the captured result immediately.

## Sync Story For Today

Implement the product story without building real distributed sync yet.

Internal statuses can be:

- `captured`
- `processing`
- `ready_for_review`
- `synced_to_canvas`

The UI should not over-explain this. It should simply make the flow feel fast:

```text
Ingest -> saved -> appears on Canvas
```

For README/demo, explain the architecture:

```text
For the hackathon prototype, local ingest and canvas run in one app.
The intended architecture is local-first ingest syncing structured memory packets to a hosted or self-hosted Canvas.
```

## AI Requirement

The prototype should not pretend rule-based logic is AI.

Today’s priority:

- Add a real LLM provider path.
- Use an OpenAI-compatible chat-completions adapter first.
- Provider can support:
  - OpenAI
  - OpenRouter
  - Groq
  - Cerebras
  - custom OpenAI-compatible base URL

Minimum AI behavior:

- If no provider/API key is configured:
  - show “AI provider required”
  - allow capture to be saved as raw draft only, or block intelligent processing
  - do not silently create summaries/reminders using rules
- If provider is configured:
  - send the input to the LLM
  - ask for structured JSON
  - create:
    - memory summary
    - reminder proposal
    - event/context proposal
    - preference/learning proposal if relevant

Rules may remain only as guardrails:

- validating empty input
- storing files
- checking provider config
- fallback error messages
- parsing the LLM JSON response

## Assistant Memory Basics

Do not make a visible, busy “assistant context” section on Canvas today.

Add the concept quietly:

- Add `soul.md` or equivalent app memory document.
- Store accepted user preferences as durable memory records.
- When the AI detects a preference or learning:
  - create a review proposal
  - user can accept/reject
- Do not expose all internal assistant memory on the main Canvas.

User-facing behavior should be simple:

```text
User: Don't remember this.
System: removes/rejects that memory.

User: Remember that I prefer compact canvas.
System: proposes preference memory, then applies after confirmation.
```

## Demo Flow For Today

Use this exact flow for submission/demo:

1. Start from blank Canvas.
2. Go to Ingest.
3. Enter:

```text
Remind me to submit the hackathon project on Sunday at 6 PM.
Also remember that Quipu is my personal memory engine prototype.
```

4. AI processes the input.
5. Ingest shows a concise saved/synced state.
6. A reminder proposal appears for review.
7. Accept the reminder.
8. Return to Canvas.
9. Canvas shows:
   - upcoming reminder
   - recent memory
   - pending/review state if any
10. Ask/search:

```text
What is Quipu?
```

Expected answer:

```text
Quipu is your personal memory engine prototype...
```

with source/citation if available.

## README Update

Update README today with:

- What Quipu is.
- Current prototype flow:
  - Canvas
  - Ingest
  - AI processing
  - review
  - reminders
- Architecture direction:
  - local-first ingest
  - hosted/self-hosted Canvas later
- Tech stack:
  - Next.js
  - TypeScript
  - pnpm
  - tRPC
  - Zod
  - Drizzle/Postgres + pgvector direction
  - OpenAI-compatible LLM provider
- How to run:

```text
pnpm install
pnpm dev
```

- What is implemented vs planned.

## Submission Assets

Prepare these before form submission:

- GitHub repo link:

```text
https://github.com/ruxir-ig/personal-memory-engine
```

- 4-slide pitch deck:
  - Problem
  - Solution + user journey
  - Tools/tech stack
  - Target audience
- Build-in-public post:
  - talk about Quipu
  - explain Canvas/Ingest
  - mention Codex
  - include repo link
  - include required hashtags

## Do Not Build Today

- Real desktop app.
- Real hosted deployment split.
- Real auth/accounts.
- Real calendar integration.
- Mobile app.
- Full OCR/audio/video processing.
- Full lifelong learning system.
- Complex UI polish.
- Self-hosting toggle.

## Final Definition Of Done For Today

- Canvas and Ingest are the only primary visible modes.
- Fresh app starts blank.
- User can ingest text.
- Real AI provider path exists for processing.
- No fake AI behavior is presented as real.
- Captured data appears on Canvas.
- Reminder proposal flow works.
- README is updated.
- App builds with:

```text
pnpm typecheck
pnpm build
```

- Commit and push to `main`.
