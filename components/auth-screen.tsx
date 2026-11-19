"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import MuiLink from "@mui/material/Link";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { registerAccount, signIn } from "@/lib/actions/auth";
import { safeInternalPath } from "@/lib/format";

export function SignInForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    const result = await signIn(email, password, nextPath);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(safeInternalPath(result.data.href, "/"));
    router.refresh();
  }

  return (
    <Box sx={{ px: 2, pt: 3 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        Sign in
      </Typography>
      <Stack component="form" spacing={1.5} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <Button type="submit" variant="contained" fullWidth disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </Stack>
      <Typography variant="body2" sx={{ mt: 2 }}>
        New here?{" "}
        <MuiLink component={NextLink} href="/auth/register">
          Create an account
        </MuiLink>
      </Typography>
      <LegalLinks />
    </Box>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    const result = await registerAccount(email, password);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(safeInternalPath(result.data.href, "/onboarding"));
    router.refresh();
  }

  return (
    <Box sx={{ px: 2, pt: 3 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
        Create account
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Family can view a trip with a share link. They don&apos;t need an account. By creating an account you agree to the{" "}
        <MuiLink component={NextLink} href="/terms">
          Terms
        </MuiLink>{" "}
        and{" "}
        <MuiLink component={NextLink} href="/privacy">
          Privacy Policy
        </MuiLink>
        .
      </Typography>
      <Stack component="form" spacing={1.5} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <TextField label="Password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <Button type="submit" variant="contained" fullWidth disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </Stack>
      <Typography variant="body2" sx={{ mt: 2 }}>
        Already have an account?{" "}
        <MuiLink component={NextLink} href="/auth/sign-in">
          Sign in
        </MuiLink>
      </Typography>
      <LegalLinks />
    </Box>
  );
}

function LegalLinks() {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
      <MuiLink component={NextLink} href="/privacy">
        Privacy
      </MuiLink>
      {" · "}
      <MuiLink component={NextLink} href="/terms">
        Terms
      </MuiLink>
    </Typography>
  );
}
