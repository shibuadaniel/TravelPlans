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
import { ProfilePhoto } from "@/components/profile-photo";
import { deleteAccount, exportAccount, removeProfilePhoto, saveProfilePhoto } from "@/lib/actions/account";
import { setSharePin } from "@/lib/actions/share-pin";
import { safeInternalPath } from "@/lib/format";

export function AccountScreen({
  email,
  name,
  pinSet,
  hasPhoto,
}: {
  email: string;
  name: string;
  pinSet: boolean;
  hasPhoto: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [photoShown, setPhotoShown] = useState(hasPhoto);

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

  async function uploadPhoto(file: File | undefined) {
    if (!file) return;
    setPending(true);
    setPhotoError(null);
    setPhotoMessage(null);
    const body = new FormData();
    body.set("photo", file);
    const result = await saveProfilePhoto(body);
    setPending(false);
    if (!result.ok) {
      setPhotoError(result.error);
      return;
    }
    setPhotoVersion((current) => current + 1);
    setPhotoShown(true);
    setPhotoMessage("Photo saved. It shows on your share links.");
    router.refresh();
  }

  async function clearPhoto() {
    setPending(true);
    setPhotoError(null);
    setPhotoMessage(null);
    const result = await removeProfilePhoto();
    setPending(false);
    if (!result.ok) {
      setPhotoError(result.error);
      return;
    }
    setPhotoShown(false);
    setPhotoMessage("Photo removed.");
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
        Profile picture
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
        This circle appears beside Where are we? when someone opens your share link.
      </Typography>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.5 }}>
        <ProfilePhoto src={photoShown ? `/api/avatar?v=${photoVersion}` : undefined} size={64} />
        <Button variant="outlined" component="label" disabled={pending}>
          {photoShown ? "Change photo" : "Add photo"}
          <Box
            component="input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void uploadPhoto(file);
            }}
          />
        </Button>
        {photoShown ? (
          <Button variant="text" disabled={pending} onClick={() => void clearPhoto()}>
            Remove
          </Button>
        ) : null}
      </Stack>
      {photoError ? <Alert severity="error" sx={{ mb: 1.5 }}>{photoError}</Alert> : null}
      {photoMessage ? <Alert severity="success" sx={{ mb: 1.5 }}>{photoMessage}</Alert> : null}
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
