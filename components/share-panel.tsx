"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  addCollaboratorAction,
  createShareAction,
  removeCollaboratorAction,
  revokeShareAction,
  rotateShareAction,
} from "@/lib/actions/trips";
import { formatDateTime } from "@/lib/format";
import type { Member, ShareLinkInfo } from "@/lib/types";

export function SharePanel({
  tripId,
  links,
  members,
}: {
  tripId: string;
  links: ShareLinkInfo[];
  members: Member[];
}) {
  const [items, setItems] = useState(links);
  const [people, setPeople] = useState(members);
  const [freshUrl, setFreshUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState<"rotate" | { type: "revoke"; id: string } | { type: "remove"; userId: string; name: string } | null>(null);

  async function create() {
    setPending(true);
    setError(null);
    const result = await createShareAction(tripId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setItems(result.data.links);
    setFreshUrl(result.data.url);
    setCopied(false);
  }

  async function rotate() {
    setConfirm(null);
    setPending(true);
    setError(null);
    const result = await rotateShareAction(tripId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setItems(result.data.links);
    setFreshUrl(result.data.url);
    setCopied(false);
  }

  async function revoke(linkId: string) {
    setConfirm(null);
    setPending(true);
    setError(null);
    const result = await revokeShareAction(tripId, linkId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setItems(result.data);
    setFreshUrl(null);
  }

  async function copy() {
    if (!freshUrl) return;
    try {
      await navigator.clipboard.writeText(freshUrl);
      setCopied(true);
    } catch {
      setError("Select the link and copy it manually.");
    }
  }

  async function addPerson() {
    setPending(true);
    setError(null);
    const result = await addCollaboratorAction(tripId, email);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPeople(result.data);
    setEmail("");
  }

  async function removePerson(userId: string) {
    setConfirm(null);
    setPending(true);
    setError(null);
    const result = await removeCollaboratorAction(tripId, userId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPeople(result.data);
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Family opens this link with no account. The raw link is shown only once.
      </Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {freshUrl ? (
        <Box>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Copy this link now. It is shown only once. If you lose it, rotate the link to create a new one.
          </Typography>
          <TextField
            label="Share link"
            value={freshUrl}
            slotProps={{ htmlInput: { readOnly: true } }}
          />
          <Button startIcon={<ContentCopyIcon />} onClick={() => void copy()} sx={{ mt: 1 }} variant="outlined">
            {copied ? "Copied" : "Copy"}
          </Button>
        </Box>
      ) : null}
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        <Button variant="contained" disabled={pending} onClick={() => void create()}>
          Create share link
        </Button>
        {items.some((link) => !link.revokedAt) ? (
          <Button variant="outlined" disabled={pending} onClick={() => setConfirm("rotate")}>
            Rotate link
          </Button>
        ) : null}
      </Stack>
      {items.some((link) => !link.revokedAt) ? null : (
        <Typography variant="body2" color="text.secondary">
          No active share link.
        </Typography>
      )}
      {items.map((link) => (
        <Box
          key={link.id}
          sx={{ display: "flex", alignItems: "center", gap: 1, borderTop: 1, borderColor: "divider", pt: 1 }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2">
              {link.revokedAt ? `Revoked ${formatDateTime(link.revokedAt)}` : `Created ${formatDateTime(link.createdAt)}`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {link.revokedAt
                ? `Created ${formatDateTime(link.createdAt)}`
                : link.lastUsedAt
                  ? `Last opened ${formatDateTime(link.lastUsedAt)}`
                  : "Not opened yet"}
            </Typography>
          </Box>
          {link.revokedAt ? null : (
            <Button color="error" disabled={pending} onClick={() => setConfirm({ type: "revoke", id: link.id })}>
              Revoke
            </Button>
          )}
        </Box>
      ))}

      <Divider sx={{ my: 1 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        Collaborators
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Add someone who already has an account. They can edit this trip. They cannot delete it or manage the share link.
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="off"
        />
        <Button variant="outlined" disabled={pending || !email.trim()} onClick={() => void addPerson()} sx={{ flexShrink: 0 }}>
          Add
        </Button>
      </Stack>
      {people.map((person) => (
        <Box key={person.userId} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap>
              {person.name || person.email}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap component="div">
              {person.email} · {person.role}
            </Typography>
          </Box>
          {person.role === "collaborator" ? (
            <Button
              color="error"
              disabled={pending}
              onClick={() => setConfirm({ type: "remove", userId: person.userId, name: person.name || person.email })}
            >
              Remove
            </Button>
          ) : null}
        </Box>
      ))}

      <ConfirmDialog
        open={confirm === "rotate"}
        title="Rotate link"
        body="Rotate the share link? Existing links will stop working."
        confirmLabel="Rotate"
        pending={pending}
        onClose={() => setConfirm(null)}
        onConfirm={() => void rotate()}
      />
      <ConfirmDialog
        open={typeof confirm === "object" && confirm?.type === "revoke"}
        title="Revoke link"
        body="Revoke this link? Anyone using it will lose access."
        confirmLabel="Revoke"
        pending={pending}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (typeof confirm === "object" && confirm?.type === "revoke") void revoke(confirm.id);
        }}
      />
      <ConfirmDialog
        open={typeof confirm === "object" && confirm?.type === "remove"}
        title="Remove collaborator"
        body={
          typeof confirm === "object" && confirm?.type === "remove"
            ? `Remove ${confirm.name}? They will lose access to this trip.`
            : ""
        }
        confirmLabel="Remove"
        pending={pending}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (typeof confirm === "object" && confirm?.type === "remove") void removePerson(confirm.userId);
        }}
      />
    </Stack>
  );
}
