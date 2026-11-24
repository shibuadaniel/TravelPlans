"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRef, useState } from "react";
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
  setShareItineraryHiddenAction,
} from "@/lib/actions/trips";
import { formatDateTime } from "@/lib/format";
import type { Member, ShareLinkInfo } from "@/lib/types";

export function SharePanel({
  tripId,
  links,
  members,
  guestEmails,
  hideItinerary = false,
}: {
  tripId: string;
  links: ShareLinkInfo[];
  members: Member[];
  guestEmails: string[];
  hideItinerary?: boolean;
}) {
  const [items, setItems] = useState(links);
  const [people, setPeople] = useState(members);
  const [allowed, setAllowed] = useState(guestEmails);
  const [itineraryHidden, setItineraryHidden] = useState(hideItinerary);
  const [freshUrl, setFreshUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const itineraryRequest = useRef(0);
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

  async function toggleItinerary(hidden: boolean) {
    const request = ++itineraryRequest.current;
    setItineraryHidden(hidden);
    setError(null);
    const result = await setShareItineraryHiddenAction(tripId, hidden);
    if (request !== itineraryRequest.current) return;
    if (!result.ok) {
      setItineraryHidden(!hidden);
      setError(result.error);
    }
  }

  async function addAllowedEmail() {
    const address = guestEmail.trim();
    setPending(true);
    setError(null);
    setSentTo(null);
    const result = await addGuestEmailAction(tripId, address, freshUrl);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAllowed(result.data.emails);
    setItems(result.data.links);
    if (result.data.url) {
      setFreshUrl(result.data.url);
      setCopied(false);
    }
    if (result.data.sendError) {
      setError(`${address} can open the link, but the email could not be sent. ${result.data.sendError}`);
      return;
    }
    setSentTo(address);
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
      {error ? <Alert severity="error">{error}</Alert> : null}
      {sentTo ? <Alert severity="success">Sent the share link to {sentTo}.</Alert> : null}

      <SectionAccordion title="Share link" defaultExpanded>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Add each email that may open this link. The first time, a code is sent to that inbox, and they must save a passkey. That device uses the passkey after that. The link is shown only once.
          </Typography>
          <Box component="label" sx={{ display: "flex", alignItems: "center", m: 0 }}>
            <Checkbox
              size="small"
              disableRipple
              checked={itineraryHidden}
              onChange={(event) => void toggleItinerary(event.target.checked)}
              sx={{ p: 0, m: 0, mr: 0.75, ml: "-3px", "& .MuiSvgIcon-root": { fontSize: 24 } }}
            />
            <Typography variant="body2" component="span" color="text.secondary">
              Hide the itinerary on the shared link
            </Typography>
          </Box>
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
            Only these addresses can open the link. Adding one emails them the share link. A code is sent to the inbox before a passkey can be saved. A new phone uses the email and a new code, then saves its own passkey. A phone that already saved one is asked only for that passkey.
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
              Add and send
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
