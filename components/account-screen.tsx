"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PinField } from "@/components/pin-field";
import { deleteAccount, exportAccount } from "@/lib/actions/account";
import { setSharePin } from "@/lib/actions/share-pin";
import { safeInternalPath } from "@/lib/format";

export function AccountScreen({ email, name, pinSet }: { email: string; name: string; pinSet: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  async function download() {
    setPending(true);
    setError(null);
    const result = await exportAccount();
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const blob = new Blob([result.data.body], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.data.filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function remove() {
    setPending(true);
    setError(null);
    const result = await deleteAccount();
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(safeInternalPath(result.data.href, "/auth/sign-in", { allowAuth: true }));
    router.refresh();
  }

  async function savePin() {
    setPending(true);
    setPinError(null);
    setPinMessage(null);
    const result = await setSharePin(pin, confirmation);
    setPending(false);
    if (!result.ok) {
      setPinError(result.error);
      return;
    }
    setPin("");
    setConfirmation("");
    setPinMessage(pinSet ? "PIN changed. Anyone who already opened a link will need this PIN." : "PIN saved. Share links will ask for it.");
    router.refresh();
  }

  return (
    <Box sx={{ px: 2, pt: 3 }}>
      <Typography variant="h4" component="h1">
        Account
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {name ? `${name} · ${email}` : email}
      </Typography>
      <Typography variant="h6" component="h2" sx={{ mt: 3 }}>
        Share PIN
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
        {pinSet
          ? "One PIN opens every trip you share. Changing it signs out anyone who already opened a link."
          : "Set one PIN for every trip you share. A link will not open until this is set."}
      </Typography>
      <Stack component="form" spacing={1.5} onSubmit={(event) => { event.preventDefault(); void savePin(); }}>
        {pinError ? <Alert severity="error">{pinError}</Alert> : null}
        {pinMessage ? <Alert severity="success">{pinMessage}</Alert> : null}
        <PinField label={pinSet ? "New PIN" : "PIN"} value={pin} onChange={setPin} />
        <PinField label="Enter it again" value={confirmation} onChange={setConfirmation} />
        <Button type="submit" variant="contained" disabled={pending}>
          {pending ? "Saving…" : pinSet ? "Change PIN" : "Set PIN"}
        </Button>
      </Stack>
      <Stack spacing={1.5} sx={{ mt: 3 }}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Button variant="outlined" disabled={pending} onClick={() => void download()}>
          Download my data
        </Button>
        <Button color="error" variant="contained" disabled={pending} onClick={() => setConfirming(true)}>
          Delete account
        </Button>
      </Stack>
      <ConfirmDialog
        open={confirming}
        title="Delete account?"
        body="This deletes your profile and every trip you own, including files and share links. It cannot be undone."
        confirmLabel={pending ? "Deleting…" : "Delete account"}
        pending={pending}
        onClose={() => setConfirming(false)}
        onConfirm={() => void remove()}
      />
    </Box>
  );
}
