# Open Questions

These decisions change the first implementation shape.

1. Should V0 be strictly local-only, or is optional hosted OpenAI-compatible
   model use acceptable from day one?
2. Which input should be first: chats, screenshots, PDFs, browser history, or
   Markdown notes?
3. Which browser should be supported first: Chromium/Chrome, Firefox, or both?
4. Which chat exports matter first: ChatGPT, Claude, WhatsApp, Telegram,
   Discord, Slack, or something else?
5. Do you want this as a local web app first, or should it become a desktop app
   with a tray/background capture daemon?
6. Should the system watch live folders continuously, or should V0 be manual
   import only?
7. Are visual memories important enough in V0 to store screenshot thumbnails,
   OCR bounding boxes, and image embeddings, or should screenshots be text-OCR
   only first?
8. Should the graph be editable by the user in V0, or only inspectable?
9. Should this integrate with Obsidian-style notes and backlinks first?
10. What is the rough expected data size: hundreds, thousands, or millions of
    artifacts/chunks?
11. Should reminders be in-app only for V0, or should they integrate with OS
    notifications/calendar from the first version?
12. Should UI personalization be controlled only through explicit settings, or
    should the assistant be allowed to propose preference changes during chat?
13. Should natural-language capture be the first V0 workflow before file import?
