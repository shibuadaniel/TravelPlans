"use client";

import CloseIcon from "@mui/icons-material/Close";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AccountScreen } from "@/components/account-screen";
import { OwnerApprovalAlert } from "@/components/owner-approval-alert";
import { ProfilePhoto } from "@/components/profile-photo";
import { signOut } from "@/lib/actions/auth";

type AccountMenu = {
  name: string;
  email: string;
  hasPhoto: boolean;
};

function accountInitial(account: AccountMenu) {
  const source = account.name.trim() || account.email.trim();
  return source.slice(0, 1).toUpperCase();
}

export function AppShell({
  account,
  children,
}: {
  account: AccountMenu | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hide =
    pathname.startsWith("/guest") ||
    /^\/trips\/[^/]+$/.test(pathname) ||
    /^\/trips\/[^/]+\/edit$/.test(pathname);
  const [open, setOpen] = useState(false);
  const initial = account ? accountInitial(account) : "";
  const photo = account?.hasPhoto ? "/api/avatar" : undefined;

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      {hide ? null : (
        <AppBar
          position="sticky"
          color="primary"
          elevation={0}
          className="no-print"
          sx={{ pt: "env(safe-area-inset-top)" }}
        >
          <Toolbar variant="dense" sx={{ minHeight: 56, gap: 1 }}>
            <FlightTakeoffIcon fontSize="small" />
            <Typography
              component={Link}
              href="/"
              variant="h6"
              sx={{
                color: "inherit",
                textDecoration: "none",
                fontFamily: 'var(--font-sans), "Inter", "Segoe UI", sans-serif',
                fontWeight: 300,
                fontSize: "1.5rem",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              Reveal
            </Typography>
            <Box sx={{ flex: 1 }} />
            {account ? (
              <IconButton edge="end" aria-label="Account menu" onClick={() => setOpen(true)} sx={{ p: 0.25 }}>
                <Box sx={{ borderRadius: "50%", outline: "2px solid rgba(255,255,255,0.9)", lineHeight: 0 }}>
                  <ProfilePhoto src={photo} size={32} initial={initial} />
                </Box>
              </IconButton>
            ) : null}
          </Toolbar>
        </AppBar>
      )}
      <SwipeableDrawer
        anchor="bottom"
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        disableSwipeToOpen
        slotProps={{
          paper: {
            sx: {
              mx: "auto",
              width: "100%",
              maxWidth: 480,
              maxHeight: "92dvh",
              overflowY: "auto",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              bgcolor: "background.default",
              pb: "calc(20px + env(safe-area-inset-bottom))",
            },
          },
        }}
      >
        {account ? (
          <Box sx={{ px: 2, pt: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <IconButton aria-label="Close" onClick={() => setOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 0.5, mb: 2.5 }}>
              <ProfilePhoto src={photo} size={80} initial={initial} />
              <Typography variant="h6" component="p" sx={{ mt: 1.5, fontFamily: "inherit" }}>
                {account.name.trim() || account.email}
              </Typography>
              {account.name.trim() ? (
                <Typography variant="body2" color="text.secondary">
                  {account.email}
                </Typography>
              ) : null}
            </Box>
            <Box
              sx={{
                bgcolor: "background.paper",
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                overflow: "hidden",
                px: 2,
                py: 2,
              }}
            >
              <AccountScreen email={account.email} name={account.name} hasPhoto={account.hasPhoto} embedded />
            </Box>
            <Box
              component="form"
              action={signOut}
              sx={{
                mt: 1.5,
                bgcolor: "background.paper",
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <Box
                component="button"
                type="submit"
                sx={{
                  display: "block",
                  width: "100%",
                  px: 2,
                  py: 1.75,
                  border: 0,
                  bgcolor: "transparent",
                  color: "text.primary",
                  textAlign: "left",
                  font: "inherit",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Log out
              </Box>
            </Box>
            <Typography
              variant="caption"
              sx={{ display: "block", mt: 2, textAlign: "center", color: "text.disabled" }}
            >
              Version 0.9.0
            </Typography>
          </Box>
        ) : null}
      </SwipeableDrawer>
      <Box
        component="main"
        sx={{
          width: "100%",
          maxWidth: { xs: 480, sm: 720 },
          mx: "auto",
          pb: "env(safe-area-inset-bottom)",
        }}
      >
        {children}
      </Box>
      <OwnerApprovalAlert signedIn={Boolean(account)} />
    </Box>
  );
}
