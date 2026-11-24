"use client";

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import EventNoteIcon from "@mui/icons-material/EventNote";
import FlightLandIcon from "@mui/icons-material/FlightLand";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
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
import type { FlightStatusChip, TripBundle } from "@/lib/types";

const KIND_ICON: Record<ItineraryPointKind, SvgIconComponent> = {
  "flight-depart": FlightTakeoffIcon,
  "flight-arrive": FlightLandIcon,
  "stay-check-in": LoginIcon,
  "stay-check-out": LogoutIcon,
  "custom-event": EventNoteIcon,
};

function todayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function dayLabel(day: ItineraryDay) {
  const date = formatDayHeading(day.date);
  return day.dayNumber !== null ? `Day ${day.dayNumber} · ${date}` : date;
}

function flightIdFor(point: ItineraryPoint) {
  if (point.kind === "flight-depart" && point.id.startsWith("flight-depart-")) {
    return point.id.slice("flight-depart-".length);
  }
  if (point.kind === "flight-arrive" && point.id.startsWith("flight-arrive-")) {
    return point.id.slice("flight-arrive-".length);
  }
  return null;
}

function PointRow({
  point,
  status,
  onOpen,
}: {
  point: ItineraryPoint;
  status?: FlightStatusChip;
  onOpen?: () => void;
}) {
  const Icon = KIND_ICON[point.kind];
  const heading = point.minutes !== null ? `${formatMinutes(point.minutes)} · ${point.title}` : point.title;
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
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
            {heading}
          </Typography>
          {point.detail || status ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
              {point.detail ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}
                >
                  {point.detail}
                </Typography>
              ) : null}
              {status ? (
                <Chip label={status.label} color={status.color} size="small" sx={{ flexShrink: 0, height: 22 }} />
              ) : null}
            </Box>
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
export function ItineraryTimeline({
  bundle,
  editable,
  flightStatuses = {},
}: {
  bundle: TripBundle;
  editable: boolean;
  flightStatuses?: Record<string, FlightStatusChip>;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerKey, setDrawerKey] = useState(0);
  const itinerary = useMemo(() => buildItinerary(bundle), [bundle]);
  const [openDates, setOpenDates] = useState<Set<string>>(() => new Set([todayKey()]));

  function toggleDay(date: string) {
    setOpenDates((current) => {
      const next = new Set(current);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

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
          const open = openDates.has(day.date);
          return (
            <Box
              component="li"
              key={day.date}
              sx={{
                position: "relative",
                pl: 3.25,
                pb: last ? 0 : open ? 2 : 1.25,
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
              <IconButton
                size="small"
                aria-expanded={open}
                aria-label={`${open ? "Close" : "Open"} ${dayLabel(day)}`}
                onClick={() => toggleDay(day.date)}
                sx={(theme) => ({
                  position: "absolute",
                  left: 0,
                  top: 1,
                  width: 16,
                  height: 16,
                  p: 0,
                  bgcolor: "#e4f1f4",
                  color: "#102a33",
                  "&:hover": { bgcolor: "#d5e8ed" },
                  ...theme.applyStyles("dark", {
                    bgcolor: "#d7eef3",
                    color: "#102a33",
                    "&:hover": { bgcolor: "#e4f1f4" },
                  }),
                })}
              >
                {open ? <RemoveIcon sx={{ fontSize: 12 }} /> : <AddIcon sx={{ fontSize: 12 }} />}
              </IconButton>
              <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", flexWrap: "wrap", minHeight: 18 }}>
                <Typography variant="subtitle2">
                  {day.dayNumber !== null ? `Day ${day.dayNumber}` : "Outside trip dates"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDayHeading(day.date)}
                </Typography>
              </Stack>

              <Box sx={{ display: open ? "block" : "none", "@media print": { display: "block" } }}>
              {day.points.length > 0 ? (
                <Stack component="ul" spacing={0.75} sx={{ listStyle: "none", m: 0, mt: 0.75, p: 0 }}>
                  {day.points.map((point) => {
                    const record = point.record;
                    const flightId = flightIdFor(point);
                    return (
                      <PointRow
                        key={point.id}
                        point={point}
                        status={flightId ? flightStatuses[flightId] : undefined}
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
