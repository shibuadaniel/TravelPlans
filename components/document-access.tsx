"use client";

import AttachFileIcon from "@mui/icons-material/AttachFile";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";

type Kind = "stay" | "insurance";
type Phase = "idle" | "requesting" | "waiting" | "approved" | "denied" | "error";

export function DocumentAccess({
  kind,
  id,
  name,
  requiresApproval,
  guest,
}: {
  kind: Kind;
  id: string;
  name: string;
  requiresApproval: boolean;
  guest: boolean;
}) {
  const href = `/api/documents/${kind}/${id}`;
  if (!guest || !requiresApproval) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0, mt: 1 }}>
        <AttachFileIcon fontSize="small" color="action" />
        <Link href={href} target="_blank" rel="noopener noreferrer" underline="hover" variant="body2" noWrap sx={{ minWidth: 0 }}>
          {name}
        </Link>
      </Box>
    );
  }
  return <RequestAccess kind={kind} id={id} name={name} href={href} />;
}

function RequestAccess({ kind, id, name, href }: { kind: Kind; id: string; name: string; href: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [requestId, setRequestId] = useState("");

  useEffect(() => {
    if (phase !== "waiting" || !requestId) return;
    let stop = false;
    let timer = 0;
    async function tick() {
      try {
        const response = await fetch(
          `/api/documents/access?kind=${kind}&id=${encodeURIComponent(id)}&request=${encodeURIComponent(requestId)}`,
          { cache: "no-store" },
        );
        const body = (await response.json()) as { status?: string };
        if (stop) return;
        if (body.status === "approved") {
          setPhase("approved");
          return;
        }
        if (body.status === "denied" || body.status === "expired") {
          setPhase("denied");
          return;
        }
      } catch {
        // The next tick retries.
      }
      if (!stop) timer = window.setTimeout(() => void tick(), 2000);
    }
    timer = window.setTimeout(() => void tick(), 1500);
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, [phase, requestId, kind, id]);

  async function requestAccess() {
    setPhase("requesting");
    try {
      const response = await fetch("/api/documents/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, id }),
      });
      const body = (await response.json()) as { ok?: boolean; status?: string; requestId?: string };
      if (!response.ok || !body.ok) {
        setPhase("error");
        return;
      }
      if (body.status === "approved" && body.requestId) {
        setRequestId(body.requestId);
        setPhase("approved");
        window.open(`${href}?request=${body.requestId}`, "_blank", "noopener,noreferrer");
        return;
      }
      if (body.status === "open") {
        setPhase("approved");
        window.open(href, "_blank", "noopener,noreferrer");
        return;
      }
      if (!body.requestId) {
        setPhase("error");
        return;
      }
      setRequestId(body.requestId);
      setPhase("waiting");
    } catch {
      setPhase("error");
    }
  }

  const note =
    phase === "waiting" || phase === "requesting"
      ? "Waiting for the owner to approve this."
      : phase === "denied"
        ? "The owner did not approve this."
        : phase === "error"
          ? "The request did not go through."
          : phase === "approved"
            ? "The owner approved this."
            : "The owner has to approve this before it opens.";

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
        <AttachFileIcon fontSize="small" color="action" />
        <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
          {name}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {note}
      </Typography>
      {phase === "approved" ? (
        <Link
          href={requestId ? `${href}?request=${requestId}` : href}
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          variant="body2"
          sx={{ display: "inline-block", mt: 1 }}
        >
          Open document
        </Link>
      ) : (
        <Button
          size="small"
          variant="contained"
          disabled={phase === "requesting" || phase === "waiting"}
          onClick={() => void requestAccess()}
          sx={{ mt: 1 }}
        >
          Request access
        </Button>
      )}
    </Box>
  );
}
