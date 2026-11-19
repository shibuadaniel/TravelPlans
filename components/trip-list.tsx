"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Fab from "@mui/material/Fab";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteTripAction } from "@/lib/actions/trips";
import { destinationKeyword, pastelGradient, travelReturnLabel } from "@/lib/format";
import type { TripListItem } from "@/lib/types";

export function TripList({ trips }: { trips: TripListItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(trips);
  const [pendingDelete, setPendingDelete] = useState<TripListItem | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hiddenPhotos, setHiddenPhotos] = useState<Record<string, boolean>>({});

  async function confirmDelete() {
    if (!pendingDelete) return;
    setPending(true);
    setError(null);
    const result = await deleteTripAction(pendingDelete.id);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setItems((current) => current.filter((trip) => trip.id !== pendingDelete.id));
    setPendingDelete(null);
    router.refresh();
  }

  return (
    <Box sx={{ px: 2, pt: 2, pb: 12 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        Your trips
      </Typography>
      {error ? (
        <Typography color="error" variant="body2" sx={{ mb: 1 }}>
          {error}
        </Typography>
      ) : null}
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No trips yet.
        </Typography>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          {items.map((trip) => {
            const label = destinationKeyword(trip.destination);
            return (
              <Card
                key={trip.id}
                elevation={0}
                sx={{ border: 1, borderColor: "divider", overflow: "hidden", position: "relative" }}
              >
                <Box
                  sx={{
                    aspectRatio: "4 / 3",
                    position: "relative",
                    overflow: "hidden",
                    background: pastelGradient(`${trip.destination}:${trip.id}`),
                  }}
                >
                  <Box
                    component={Link}
                    href={`/trips/${trip.id}`}
                    aria-label={label}
                    sx={{ position: "absolute", inset: 0, zIndex: 1 }}
                  />
                  {trip.photo && !hiddenPhotos[trip.id] ? (
                    <>
                      <Box
                        component="img"
                        src={trip.photo.url}
                        alt=""
                        onError={() => setHiddenPhotos((current) => ({ ...current, [trip.id]: true }))}
                        sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <Typography
                        component="a"
                        href={trip.photo.creditUrl}
                        target="_blank"
                        rel="noreferrer"
                        sx={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          bottom: 0,
                          zIndex: 2,
                          px: 0.75,
                          py: 0.25,
                          fontSize: 10,
                          lineHeight: 1.3,
                          color: "#fff",
                          bgcolor: "rgba(0,0,0,0.45)",
                          textDecoration: "none",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {trip.photo.credit}
                      </Typography>
                    </>
                  ) : null}
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, pl: 1, pr: 0.25, pt: 0.75 }}>
                  <Typography
                    component={Link}
                    href={`/trips/${trip.id}`}
                    variant="subtitle2"
                    noWrap
                    sx={{ flex: 1, position: "relative", zIndex: 2, color: "inherit", textDecoration: "none" }}
                  >
                    {label}
                  </Typography>
                  {trip.role === "owner" ? (
                    <IconButton
                      aria-label={`Delete ${label}`}
                      onClick={() => setPendingDelete(trip)}
                      sx={{ position: "relative", zIndex: 2 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  ) : (
                    <Box sx={{ width: 28 }} />
                  )}
                </Box>
                <Typography
                  component={Link}
                  href={`/trips/${trip.id}`}
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", position: "relative", zIndex: 2, px: 1, pb: 1, color: "text.secondary", textDecoration: "none" }}
                >
                  {travelReturnLabel(trip.travelDate, trip.returnDate)}
                </Typography>
              </Card>
            );
          })}
        </Box>
      )}
      <Fab
        color="primary"
        aria-label="New trip"
        component={Link}
        href="/trips/new"
        sx={{ position: "fixed", right: 16, bottom: "calc(16px + env(safe-area-inset-bottom))", zIndex: 5 }}
      >
        <AddIcon />
      </Fab>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete trip"
        body={`Delete ${pendingDelete ? destinationKeyword(pendingDelete.destination) : "this trip"}? This cannot be undone.`}
        confirmLabel="Delete"
        pending={pending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </Box>
  );
}
