"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { ProfilePhoto } from "@/components/profile-photo";
import { displayDestination } from "@/lib/format";

export function TitleChrome({
  backHref,
  onBack,
  backLabel = "Back",
  title,
  subtitle,
  actions,
  avatarSrc,
  tint = false,
}: {
  backHref?: string;
  onBack?: () => void;
  backLabel?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  avatarSrc?: string;
  tint?: boolean;
}) {
  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        bgcolor: "background.default",
        px: 2,
        pt: "calc(16px + env(safe-area-inset-top))",
        pb: 0.5,
      }}
    >
      <Box
        sx={(theme) => ({
          bgcolor: tint ? "#e4f1f4" : "background.paper",
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          gap: 2,
          px: 2,
          py: 1.5,
          ...(tint ? theme.applyStyles("dark", { bgcolor: "#243e48" }) : {}),
        })}
      >
      {onBack || backHref ? (
        <IconButton
          {...(onBack ? { onClick: onBack } : { component: Link, href: backHref })}
          aria-label={backLabel}
          className="no-print"
          sx={{ ml: -0.5 }}
        >
          <ArrowBackIcon />
        </IconButton>
      ) : null}
      {avatarSrc !== undefined ? <ProfilePhoto src={avatarSrc || undefined} size={44} /> : null}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="h4"
          component="h1"
          noWrap
          sx={{ fontSize: { xs: "1.25rem", sm: "1.35rem" }, lineHeight: 1.2 }}
        >
          {displayDestination(title)}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" noWrap>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {actions ? (
        <Box className="no-print" sx={{ display: "flex", alignItems: "center", mr: -0.5 }}>
          {actions}
        </Box>
      ) : null}
      </Box>
    </Box>
  );
}
