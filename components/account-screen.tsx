"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteAccount, exportAccount } from "@/lib/actions/account";

export function AccountScreen({ email, name }: { email: string; name: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);

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
    router.push(result.data.href);
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
