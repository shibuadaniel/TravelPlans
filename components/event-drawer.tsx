"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { deleteTripEventAction, saveTripEventAction } from "@/lib/actions/trips";
import type { DateKey } from "@/lib/itinerary";
import type { TripEvent } from "@/lib/types";

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 2000;

// Keep each label above its box so it never sits on the hint text.
const raisedLabel = { inputLabel: { shrink: true } };

export type EventDraft = {
  date: DateKey;
  dayLabel: string;
  /** Present when editing an existing event. */
  event?: TripEvent;
};

/**
 * Bottom sheet for adding or editing an itinerary event.
 * Mount it with a new `key` for each draft so the fields start fresh.
 */
export function EventDrawer({
  tripId,
  draft,
  open,
  onClose,
  onSaved,
}: {
  tripId: string;
  draft: EventDraft | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = Boolean(draft?.event);
  const [title, setTitle] = useState(draft?.event?.title ?? "");
  const [description, setDescription] = useState(draft?.event?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function run(task: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    try {
      const result = await task();
      if (!result.ok) {
        setError(result.error ?? "Couldn't save the event. Try again.");
        return;
      }
      onSaved();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (!draft) return;
    void run(() =>
      saveTripEventAction(tripId, {
        id: draft.event?.id ?? null,
        eventDate: draft.date,
        title,
        description,
      }),
    );
  }

  function remove() {
    const id = draft?.event?.id;
    if (!id) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    void run(() => deleteTripEventAction(tripId, id));
  }

  const canSave = title.trim().length > 0 && !busy;

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={busy ? undefined : onClose}
      slotProps={{
        paper: {
          sx: {
            mx: "auto",
            width: "100%",
            maxWidth: 480,
            maxHeight: "92dvh",
            overflowY: "auto",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          },
        },
      }}
    >
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) save();
        }}
        sx={{ px: 2, pt: 1, pb: "calc(16px + env(safe-area-inset-bottom))" }}
      >
        <Box aria-hidden sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: "divider", mx: "auto", mb: 1.5 }} />
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" component="h2">
              {editing ? "Edit event" : "Add event"}
            </Typography>
            {draft ? (
              <Typography variant="body2" color="text.secondary">
                {draft.dayLabel}
              </Typography>
            ) : null}
          </Box>
          <TextField
            id="itinerary-event-title"
            label="Event name"
            placeholder="e.g. Sightseeing tour"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            autoFocus
            slotProps={{ ...raisedLabel, htmlInput: { maxLength: TITLE_MAX } }}
          />
          <TextField
            id="itinerary-event-description"
            label="Description"
            placeholder="Meeting point, tickets, who's going…"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            multiline
            minRows={3}
            maxRows={8}
            slotProps={{ ...raisedLabel, htmlInput: { maxLength: DESCRIPTION_MAX } }}
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            {editing ? (
              <Button color="error" disabled={busy} onClick={remove}>
                {confirmDelete ? "Tap again to delete" : "Delete"}
              </Button>
            ) : null}
            <Box sx={{ flex: 1 }} />
            <Button onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={!canSave}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
