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
  backLabel = "Back",
  title,
  subtitle,
  actions,
  avatarSrc,
}: {
  backHref?: string;
  backLabel?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  avatarSrc?: string;
}) {
  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        bgcolor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        px: 0.5,
        py: 1,
        pt: "calc(8px + env(safe-area-inset-top))",
      }}
    >
      {backHref ? (
        <IconButton
          component={Link}
          href={backHref}
          aria-label={backLabel}
          className="no-print"
        >
          <ArrowBackIcon />
        </IconButton>
      ) : (
        <Box sx={{ width: 8 }} />
      )}
      {avatarSrc !== undefined ? <ProfilePhoto src={avatarSrc || undefined} size={44} /> : null}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="h4"
          component="h1"
          noWrap
          sx={{ fontSize: { xs: "1.6rem", sm: "2rem" }, lineHeight: 1.15 }}
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
        <Box className="no-print" sx={{ display: "flex", alignItems: "center" }}>
          {actions}
        </Box>
      ) : null}
    </Box>
  );
}
