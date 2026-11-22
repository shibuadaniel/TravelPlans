"use client";

import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import type { AuthenticationResponseJSON, PublicKeyCredentialRequestOptionsJSON, RegistrationResponseJSON } from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { ProfilePhoto } from "@/components/profile-photo";
import { submitShareCode, submitShareEmail } from "@/lib/actions/share-pin";
import { safeInternalPath } from "@/lib/format";

type PasskeyOptions = PublicKeyCredentialCreationOptionsJSON | PublicKeyCredentialRequestOptionsJSON;
type DevicePasskey = "unknown" | "saved" | "new";

function passkeyStorageKey(tripId: string) {
  return `where-are-we-passkey:${tripId}`;
}

function rememberPasskey(tripId: string) {
  try {
    localStorage.setItem(passkeyStorageKey(tripId), "1");
  } catch {
    // Private browsing can block storage. The passkey itself still opens the trip.
  }
}

function forgetPasskey(tripId: string) {
  try {
    localStorage.removeItem(passkeyStorageKey(tripId));
  } catch {
    // Ignore storage failures. The email and PIN form is the fallback.
  }
}

export function GuestPinForm({
  tripId,
  hasPhoto = false,
  needsPasskey = false,
  needsCode = false,
  codeEmail = "",
}: {
  tripId: string;
  hasPhoto?: boolean;
  needsPasskey?: boolean;
  needsCode?: boolean;
  codeEmail?: string;
}) {
  const [email, setEmail] = useState(codeEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [savePasskey, setSavePasskey] = useState(needsPasskey);
  const [awaitingCode, setAwaitingCode] = useState(needsCode && !needsPasskey);
  const [device, setDevice] = useState<DevicePasskey>("unknown");

  useEffect(() => {
    try {
      setDevice(localStorage.getItem(passkeyStorageKey(tripId)) === "1" ? "saved" : "new");
    } catch {
      setDevice("new");
    }
  }, [tripId]);

  function openTrip(href: string) {
    window.location.assign(safeInternalPath(href, "/"));
  }

  async function readPasskey(path: string, credential: RegistrationResponseJSON | AuthenticationResponseJSON) {
    const verified = await fetch(path, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(credential),
    });
    return (await verified.json()) as { ok: true; href: string } | { ok: false; error: string };
  }

  async function passkeyOptions(path: string) {
    const response = await fetch(path, { method: "POST" });
    return (await response.json()) as { ok: true; options: PasskeyOptions } | { ok: false; error: string };
  }

  async function registerPasskey() {
    setPending(true);
    setError(null);
    const options = await passkeyOptions("/api/passkey/register");
    if (!options.ok) {
      setPending(false);
      setError(options.error);
      return;
    }
    try {
      const credential = await startRegistration({
        optionsJSON: options.options as PublicKeyCredentialCreationOptionsJSON,
      });
      const result = await readPasskey("/api/passkey/register", credential);
      setPending(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      rememberPasskey(tripId);
      openTrip(result.href);
    } catch (caught) {
      setPending(false);
      const name = caught instanceof Error ? caught.name : "";
      if (name === "InvalidStateError") {
        await usePasskey();
        return;
      }
      setSavePasskey(true);
      setError(name === "NotAllowedError" ? "Save a passkey to open the trip." : "This browser could not save a passkey.");
    }
  }

  async function usePasskey() {
    setPending(true);
    setError(null);
    const options = await passkeyOptions("/api/passkey/login");
    if (!options.ok) {
      setPending(false);
      setError(options.error);
      return;
    }
    try {
      const credential = await startAuthentication({
        optionsJSON: options.options as PublicKeyCredentialRequestOptionsJSON,
      });
      const result = await readPasskey("/api/passkey/login", credential);
      setPending(false);
      if (!result.ok) {
        if (result.error === "Enter your email on this device.") {
          forgetPasskey(tripId);
          setDevice("new");
          setSavePasskey(false);
        }
        setError(result.error);
        return;
      }
      rememberPasskey(tripId);
      openTrip(result.href);
    } catch (caught) {
      setPending(false);
      const name = caught instanceof Error ? caught.name : "";
      setError(name === "NotAllowedError" ? "Use the passkey on this device to open the trip." : "This browser could not use a passkey.");
    }
  }

  async function submit() {
    setPending(true);
    setError(null);
    const result = await submitShareEmail(email);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAwaitingCode(true);
    setCode("");
  }

  async function submitCode() {
    setPending(true);
    setError(null);
    const result = await submitShareCode(code);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAwaitingCode(false);
    setSavePasskey(true);
  }

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", px: 2 }}>
      <Stack
        component="form"
        spacing={1.5}
        onSubmit={(event) => {
          event.preventDefault();
          if (savePasskey || (device === "saved" && !awaitingCode)) return;
          if (awaitingCode) {
            void submitCode();
            return;
          }
          void submit();
        }}
        sx={{
          width: "100%",
          maxWidth: 360,
          p: 3,
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <ProfilePhoto src={hasPhoto ? "/api/avatar" : undefined} />
          <Typography variant="h5" component="h1">
            Reveal
          </Typography>
        </Box>
        {savePasskey || awaitingCode || device !== "unknown" ? (
          <Typography variant="body2" color="text.secondary">
            {savePasskey
              ? "Save a passkey on this device to open the trip."
              : awaitingCode
                ? `Enter the code sent to ${email}.`
                : device === "saved"
                  ? "Use the passkey saved on this device."
                  : "Enter the email from the person who sent this link. A code is sent to that inbox."}
          </Typography>
        ) : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        {savePasskey ? (
          <Button type="button" variant="contained" disabled={pending} onClick={() => void registerPasskey()}>
            {pending ? "Waiting…" : "Save passkey"}
          </Button>
        ) : awaitingCode ? (
          <>
            <TextField
              label="Code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              autoComplete="one-time-code"
              slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 6 } }}
              required
            />
            <Button type="submit" variant="contained" disabled={pending}>
              {pending ? "Checking…" : "Continue"}
            </Button>
            <Button type="button" variant="text" disabled={pending} onClick={() => { setAwaitingCode(false); setError(null); }}>
              Use email again
            </Button>
          </>
        ) : device === "saved" ? (
          <Button type="button" variant="contained" disabled={pending} onClick={() => void usePasskey()}>
            {pending ? "Waiting…" : "Use a saved passkey"}
          </Button>
        ) : device === "new" ? (
          <>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
            <Button type="submit" variant="contained" disabled={pending}>
              {pending ? "Checking…" : "Continue"}
            </Button>
            <Button type="button" variant="text" disabled={pending} onClick={() => void usePasskey()}>
              Use a saved passkey
            </Button>
          </>
        ) : null}
      </Stack>
    </Box>
  );
}
