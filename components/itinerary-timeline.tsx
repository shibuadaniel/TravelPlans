"use client";

import AddIcon from "@mui/icons-material/Add";
import EventNoteIcon from "@mui/icons-material/EventNote";
import FlightLandIcon from "@mui/icons-material/FlightLand";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SvgIconComponent } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EmptyNote } from "@/components/fields";
import { EventDrawer, type EventDraft } from "@/components/event-drawer";
import {
  buildItinerary,
  formatDayHeading,
  formatMinutes,
  type ItineraryDay,
  type ItineraryPoint,
  type ItineraryPointKind,
} from "@/lib/itinerary";
import type { TripBundle } from "@/lib/types";

const KIND_ICON: Record<ItineraryPointKind, SvgIconComponent> = {
  "flight-depart": FlightTakeoffIcon,
  "flight-arrive": FlightLandIcon,
  "stay-check-in": LoginIcon,
  "stay-check-out": LogoutIcon,
  "custom-event": EventNoteIcon,
};

function dayLabel(day: ItineraryDay) {
  const date = formatDayHeading(day.date);
  return day.dayNumber !== null ? `Day ${day.dayNumber} · ${date}` : date;
}

function PointRow({ point, onOpen }: { point: ItineraryPoint; onOpen?: () => void }) {
  const Icon = KIND_ICON[point.kind];
  return (
    <Box component="li">
      <ButtonBase
        component={onOpen ? "button" : "div"}
        disabled={!onOpen}
        onClick={onOpen}
        aria-label={onOpen ? `Edit ${point.title}` : undefined}
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          gap: 1,
          width: "100%",
          textAlign: "left",
          borderRadius: 1,
          py: 0.25,
          "&.Mui-disabled": { pointerEvents: "none" },
          "&:hover": onOpen ? { bgcolor: "action.hover" } : undefined,
        }}
      >
        <Icon fontSize="small" color="action" sx={{ mt: 0.25, flexShrink: 0 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
            {point.minutes !== null ? `${formatMinutes(point.minutes)} · ${point.title}` : point.title}
          </Typography>
          {point.detail ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}
            >
              {point.detail}
            </Typography>
          ) : null}
        </Box>
      </ButtonBase>
    </Box>
  );
}

/**
 * Day-by-day itinerary. Owners and collaborators can add, edit and delete
 * events and see notes about entries that were skipped. Guests read only.
 */
export function ItineraryTimeline({ bundle, editable }: { bundle: TripBundle; editable: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerKey, setDrawerKey] = useState(0);
  const itinerary = useMemo(() => buildItinerary(bundle), [bundle]);

  function openDrawer(next: EventDraft) {
    setDraft(next);
    setDrawerKey((key) => key + 1);
    setDrawerOpen(true);
  }

  const issues =
    editable && itinerary.issues.length > 0 ? (
      <Alert severity="warning" className="no-print">
        <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
          {itinerary.issues.map((issue) => (
            <li key={issue.id}>
              <Typography variant="body2">{issue.message}</Typography>
            </li>
          ))}
        </Stack>
      </Alert>
    ) : null;

  if (itinerary.days.length === 0) {
    return (
      <Stack spacing={1.5}>
        {issues}
        <EmptyNote>Add flights, stays or trip dates to see the itinerary.</EmptyNote>
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      {issues}
      <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {itinerary.days.map((day, index) => {
          const last = index === itinerary.days.length - 1;
          return (
            <Box
              component="li"
              key={day.date}
              sx={{
                position: "relative",
                pl: 3,
                pb: last ? 0 : 2,
                // Line connecting the days.
                "&::before": last
                  ? undefined
                  : {
                      content: '""',
                      position: "absolute",
                      left: 7,
                      top: 18,
                      bottom: 0,
                      borderLeft: "2px solid",
                      borderColor: "divider",
                    },
              }}
            >
              <Box
                aria-hidden
                sx={{
                  position: "absolute",
                  left: 2,
                  top: 5,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  bgcolor: day.outsideTrip ? "warning.main" : "primary.main",
                }}
              />
              <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", flexWrap: "wrap" }}>
                <Typography variant="subtitle2">
                  {day.dayNumber !== null ? `Day ${day.dayNumber}` : "Outside trip dates"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDayHeading(day.date)}
                </Typography>
              </Stack>

              {day.points.length > 0 ? (
                <Stack component="ul" spacing={0.75} sx={{ listStyle: "none", m: 0, mt: 0.75, p: 0 }}>
                  {day.points.map((point) => {
                    const record = point.record;
                    return (
                      <PointRow
                        key={point.id}
                        point={point}
                        onOpen={
                          editable && record
                            ? () => openDrawer({ date: day.date, dayLabel: dayLabel(day), event: record })
                            : undefined
                        }
                      />
                    );
                  })}
                </Stack>
              ) : !editable ? (
                <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                  Nothing planned yet
                </Typography>
              ) : null}

              {editable ? (
                <Button
                  className="no-print"
                  startIcon={<AddIcon fontSize="small" />}
                  onClick={() => openDrawer({ date: day.date, dayLabel: dayLabel(day) })}
                  sx={{ mt: 0.5, ml: -0.75, minHeight: 30 }}
                >
                  Add event
                </Button>
              ) : null}
            </Box>
          );
        })}
      </Box>
      {editable ? (
        <EventDrawer
          key={drawerKey}
          tripId={bundle.trip.id}
          draft={draft}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onSaved={() => {
            setDrawerOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </Stack>
  );
}
