# Views & Features

## Tasks View

The main view. Everything lives here.

### Layout

**Title bar** — shows the global hotkey hint, a red overdue count (if any tasks are past due), the total pending count, and a "clear done" button.

**Critical section** — P0 and P1 tasks, sorted by due date. These stay pinned at the top so urgent work is never buried.

**Tasks section** — P2–P5 tasks. Drag the handle that appears on hover to reorder tasks within this section.

**Completed section** — Recently completed tasks, collapsed by default. Expand to review or restore.

**Input strip** — Type a task and press Enter. A due date picker button sits to the left of the input if you prefer clicking over typing.

### Detection Preview

As you type, a preview strip above the input shows what Assistask has detected:

```
⚡ P1 — High  ·  Due: Tomorrow 9:00 AM
```

This updates live as you adjust your phrasing. If nothing is detected, the strip stays empty — the task will be added as P2 with no due date.

### Overdue Indicators

Overdue tasks get a **red left border** and a **🔔** bell icon. The title bar shows a red count of how many tasks are overdue.

### Drag to Reorder

Hover over any task in the Tasks section to reveal a drag handle on the left. Drag to reorder. Critical tasks cannot be manually reordered — they always sort by due date.

---

## Morning Standup View

Generates a formatted summary of your current task state, structured for a standup or async update:

- **Overdue** — tasks past their due date
- **Due today** — tasks due today
- **High priority** — P0/P1 tasks without a due date
- **Done yesterday** — tasks completed in the last 24 hours

Hit **Copy** to copy the full summary to clipboard, ready to paste into Slack, Teams, or an email.

---

## Completed View

Browse all completed tasks. You can **permanently delete** individual tasks or all of them from here. Deleted tasks are gone — export your data first if you want a record.

---

## Timezone Clocks

Configure up to two extra clocks alongside your local time. Useful for always knowing what time it is for teammates in other cities.

When enabled, the header displays:

```
LOCAL 14:32  —  NYC 09:32  —  LON 14:32
```

Times update every 30 seconds. See **[Settings](settings.md)** for setup.

---

## Notifications

Assistask shows a system notification when a task hits its due time. If the task remains incomplete, it can repeat the notification on a configurable interval (1–24 hours). See **[Settings](settings.md)** to enable and configure.

---

## VU Meter

Type `/vu` to toggle audio visualization. The pixel letters in the ASSISTASK title react to system audio via WASAPI (Windows audio capture). Requires audio input permissions.

Type `/vu` again to turn it off.

---

## Shiny Mode

Type `/shiny` to toggle a rainbow wave animation across the ASSISTASK title. Type it again to return to the normal title color.

---

## My Lists

Browse all named list snapshots you have saved. Access it from the **☰** menu.

Each entry shows the snapshot name and the date it was saved. From here you can:

- **Save** — update this snapshot with your current active tasks. Disabled when the snapshot already matches your current tasks (nothing to save).
- **Restore** — load the snapshot's tasks into Assistask. If you have existing tasks, you'll be prompted to choose:
  - **Replace** — discard current tasks and load the snapshot
  - **Append** — keep current tasks and merge in the snapshot's tasks. Tasks marked done locally that are active in the snapshot are restored to active.
- **Delete** — permanently remove the snapshot (your current tasks are not affected)

### Starting a new list

The **+ List** button (top right of My Lists) clears your current active tasks and takes you to a fresh empty list, ready to fill and save under a new name.

- The button is **disabled** until you have at least one saved snapshot — so your work is never lost by accident.
- If your current active tasks haven't been saved to any snapshot yet, Assistask will warn you before proceeding. Choose **Continue** to discard and start fresh, or **Cancel** to go back and save first.

Snapshots are saved to disk and survive restarts, reboots, and WebView cache clears.

To create a snapshot, go to **Settings → List Code → Save Code**. To transfer a list between devices without saving, use **Copy List Code** and **Import List Code** instead. See **[Settings](settings.md#list-code)** for details.
