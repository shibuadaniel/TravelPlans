"use client";

import IosShareIcon from "@mui/icons-material/IosShare";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import { useState } from "react";
import { SharePanel } from "@/components/share-panel";
import type { Member, ShareLinkInfo } from "@/lib/types";

export function ShareTripButton({
  tripId,
  links,
  members,
  pinReady,
}: {
  tripId: string;
  links: ShareLinkInfo[];
  members: Member[];
  pinReady: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton aria-label="Share trip" onClick={() => setOpen(true)}>
        <IosShareIcon />
      </IconButton>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Share trip</DialogTitle>
        <DialogContent>
          {open ? <SharePanel tripId={tripId} links={links} members={members} pinReady={pinReady} /> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
