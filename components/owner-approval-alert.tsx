"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";

type ApprovalRequest = { id: string; documentName: string; tripName: string; requesterEmail: string | null };

export function OwnerApprovalAlert({ signedIn }: { signedIn: boolean }) {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    let stop = false;
    async function load() {
      if (document.hidden) return;
      try {
        const response = await fetch("/api/approvals", { cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json()) as { ok: boolean; requests?: ApprovalRequest[] };
        if (!stop && body.ok && body.requests) setRequests(body.requests);
      } catch {
        // The next poll retries. A missed alert should not break the page.
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 4000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [signedIn]);

  async function decide(id: string, decision: "approved" | "denied") {
    setPendingId(id);
    const response = await fetch("/api/approvals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, decision }),
    });
    setPendingId(null);
    if (response.ok) setRequests((current) => current.filter((item) => item.id !== id));
  }

  if (!signedIn || requests.length === 0) return null;

  return (
    <Box
      className="no-print"
      sx={{
        position: "fixed",
        zIndex: 1400,
        left: 16,
        right: 16,
        bottom: "calc(16px + env(safe-area-inset-bottom))",
        maxWidth: 420,
        mx: "auto",
      }}
    >
      <Stack spacing={1}>
        {requests.map((item) => (
          <Box
            key={item.id}
            role="status"
            sx={{ p: 2, bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: 2, boxShadow: 3 }}
          >
            <Typography variant="subtitle2">Approve a document</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {`${item.requesterEmail || "A guest"} wants to open ${item.documentName}${item.tripName ? ` on ${item.tripName}` : ""}.`}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <Button variant="contained" disabled={pendingId === item.id} onClick={() => void decide(item.id, "approved")}>
                Approve
              </Button>
              <Button variant="text" disabled={pendingId === item.id} onClick={() => void decide(item.id, "denied")}>
                Not now
              </Button>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
