"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SectionAccordion } from "@/components/section-accordion";
import {
  addCollaboratorAction,
  addGuestEmailAction,
  createShareAction,
  removeCollaboratorAction,
  removeGuestEmailAction,
  revokeShareAction,
  rotateShareAction,
} from "@/lib/actions/trips";
import { formatDateTime } from "@/lib/format";
import type { Member, ShareLinkInfo } from "@/lib/types";

export function SharePanel({
  tripId,
  links,
  members,
  pinReady,
  guestEmails,
}: {
  tripId: string;
  links: ShareLinkInfo[];
  members: Member[];
  pinReady: boolean;
  guestEmails: string[];
}) {
  const [items, setItems] = useState(links);
  const [people, setPeople] = useState(members);
  const [allowed, setAllowed] = useState(guestEmails);
  const [freshUrl, setFreshUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
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

  async function addAllowedEmail() {
    setPending(true);
    setError(null);
    const result = await addGuestEmailAction(tripId, guestEmail);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAllowed(result.data);
    setGuestEmail("");
  }

  async function removeAllowedEmail(address: string) {
    setPending(true);
    setError(null);
    const result = await removeGuestEmailAction(tripId, address);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAllowed(result.data);
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
      {pinReady ? null : (
        <Alert severity="info">
          Set a share PIN on your{" "}
          <Link component={NextLink} href="/account">
            account
          </Link>{" "}
          before a link will open.
        </Alert>
      )}
      {error ? <Alert severity="error">{error}</Alert> : null}

      <SectionAccordion title="Share link" defaultExpanded>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Add each email that may open this link. The first time, they enter your PIN and must save a passkey. That device uses the passkey after that. The same PIN covers every trip. Change it on Account if it leaks. That signs out anyone who already opened a link. The link is shown only once.
          </Typography>
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
            <Button variant="contained" disabled={pending || !pinReady} onClick={() => void create()}>
              Create share link
            </Button>
            {items.some((link) => !link.revokedAt) ? (
              <Button variant="outlined" disabled={pending || !pinReady} onClick={() => setConfirm("rotate")}>
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
            <Box key={link.id} sx={{ borderTop: 1, borderColor: "divider", pt: 1 }}>
              <Typography variant="body2">
                {link.revokedAt ? `Revoked ${formatDateTime(link.revokedAt)}` : `Created ${formatDateTime(link.createdAt)}`}
              </Typography>
              <Typography variant="caption" color="text.secondary" component="div">
                {link.revokedAt
                  ? `Created ${formatDateTime(link.createdAt)}`
                  : link.lastUsedAt
                    ? `Last opened ${formatDateTime(link.lastUsedAt)}`
                    : "Not opened yet"}
              </Typography>
              {link.revokedAt ? null : (
                <Button
                  color="error"
                  disabled={pending}
                  onClick={() => setConfirm({ type: "revoke", id: link.id })}
                  sx={{ mt: 0.5, px: 0, minWidth: 0, justifyContent: "flex-start" }}
                >
                  Revoke
                </Button>
              )}
            </Box>
          ))}
        </Stack>
      </SectionAccordion>

      <SectionAccordion title="Emails that can open the link">
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Only these addresses can enter the PIN. A new phone can use the email and PIN, then save its own passkey. A phone that already saved one is asked only for that passkey.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              label="Allowed email"
              type="email"
              value={guestEmail}
              onChange={(event) => setGuestEmail(event.target.value)}
              autoComplete="off"
            />
            <Button variant="outlined" disabled={pending || !guestEmail.trim()} onClick={() => void addAllowedEmail()} sx={{ flexShrink: 0 }}>
              Add
            </Button>
          </Stack>
          {allowed.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No emails yet. The link stays closed until you add one.
            </Typography>
          ) : null}
          {allowed.map((address) => (
            <Box key={address} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                {address}
              </Typography>
              <Button color="error" disabled={pending} onClick={() => void removeAllowedEmail(address)}>
                Remove
              </Button>
            </Box>
          ))}
        </Stack>
      </SectionAccordion>

      <SectionAccordion title="Collaborators">
        <Stack spacing={1.5}>
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
        </Stack>
      </SectionAccordion>

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
