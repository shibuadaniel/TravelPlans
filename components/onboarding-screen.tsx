"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { finishOnboarding } from "@/lib/actions/auth";

export function OnboardingScreen() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(next: "trips" | "create") {
    setPending(true);
    setError(null);
    const result = await finishOnboarding(name, next);
    if (!result.ok) setError(result.error);
    setPending(false);
  }

  return (
    <Box sx={{ px: 2, pt: 3 }}>
      <Typography variant="h4" component="h1">
        Welcome
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
        What should we call you?
      </Typography>
      <Stack spacing={1.5}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <TextField label="Your name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
        <Button variant="contained" fullWidth disabled={pending} onClick={() => void submit("create")}>
          Create your first trip
        </Button>
        <Button fullWidth disabled={pending} onClick={() => void submit("trips")}>
          Go to your trips
        </Button>
      </Stack>
    </Box>
  );
}
