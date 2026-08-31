# My ACE Command Center v2

My ACE is a judgment UI over canonical Drive / Sheets data, not a second source of truth.

## Top-level decisions

- First move: choose one current task from TASK_BOARD.
- Deadline 7D: show due-soon count and overdue hygiene debt.
- Live revenue: exclude Stripe test payments; show only live paid revenue and customers.
- Focus project: surface an S-priority ACTIVE project and its next action.
- System health: surface Drive -> Supabase sync anomalies.

## Navigation

Source cards and quick links open the canonical Calendar / TASK_BOARD / Projects / Content / Want to sources for editing.

Calendar remains canonical externally for now; no second calendar store is introduced in this change.
