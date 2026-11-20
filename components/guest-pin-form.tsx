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
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PinField } from "@/components/pin-field";
import { ProfilePhoto } from "@/components/profile-photo";
import { submitSharePin } from "@/lib/actions/share-pin";
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
}: {
  tripId: string;
  hasPhoto?: boolean;
  needsPasskey?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [savePasskey, setSavePasskey] = useState(needsPasskey);
  const [device, setDevice] = useState<DevicePasskey>("unknown");

  useEffect(() => {
    try {
      setDevice(localStorage.getItem(passkeyStorageKey(tripId)) === "1" ? "saved" : "new");
    } catch {
      setDevice("new");
    }
  }, [tripId]);

  function openTrip(href: string) {
    router.push(safeInternalPath(href, "/"));
    router.refresh();
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
        if (result.error === "Enter your email and PIN on this device.") {
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
    const result = await submitSharePin(email, pin);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSavePasskey(true);
  }

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", px: 2 }}>
      <Stack
        component="form"
        spacing={1.5}
        onSubmit={(event) => {
          event.preventDefault();
          if (savePasskey || device === "saved") return;
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
            Where are we?
          </Typography>
        </Box>
        {savePasskey || device !== "unknown" ? (
          <Typography variant="body2" color="text.secondary">
            {savePasskey
              ? "Save a passkey on this device to open the trip."
              : device === "saved"
                ? "Use the passkey saved on this device."
                : "Enter the email and PIN from the person who sent this link."}
          </Typography>
        ) : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        {savePasskey ? (
          <Button type="button" variant="contained" disabled={pending} onClick={() => void registerPasskey()}>
            {pending ? "Waiting…" : "Save passkey"}
          </Button>
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
            <PinField label="PIN" value={pin} onChange={setPin} />
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
