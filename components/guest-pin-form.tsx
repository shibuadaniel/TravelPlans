"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PinField } from "@/components/pin-field";
import { submitSharePin } from "@/lib/actions/share-pin";
import { safeInternalPath } from "@/lib/format";

export function GuestPinForm() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    const result = await submitSharePin(pin);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(safeInternalPath(result.data.href, "/"));
    router.refresh();
  }

  return (
    <Box sx={{ px: 2, py: 4 }}>
      <Typography variant="h5" component="h1">
        Where are we?
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
        Enter the PIN from the person who sent this link.
      </Typography>
      <Stack component="form" spacing={1.5} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <PinField label="PIN" value={pin} onChange={setPin} />
        <Button type="submit" variant="contained" disabled={pending}>
          {pending ? "Checking…" : "Open trip"}
        </Button>
      </Stack>
    </Box>
  );
}
