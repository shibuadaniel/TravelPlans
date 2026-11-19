"use client";

import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/actions/auth";

function hideBrandBar(pathname: string) {
  if (pathname.startsWith("/guest")) return true;
  if (/^\/trips\/[^/]+$/.test(pathname)) return true;
  return /^\/trips\/[^/]+\/edit$/.test(pathname);
}

export function AppShell({
  signedIn,
  children,
}: {
  signedIn: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hide = hideBrandBar(pathname);

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
              sx={{ color: "inherit", textDecoration: "none", fontSize: "1.25rem" }}
            >
              Where are we?
            </Typography>
            <Box sx={{ flex: 1 }} />
            {signedIn ? (
              <>
                <Button component={Link} href="/account" color="inherit">
                  Account
                </Button>
                <Box component="form" action={signOut}>
                  <Button type="submit" color="inherit">
                    Sign out
                  </Button>
                </Box>
              </>
            ) : null}
          </Toolbar>
        </AppBar>
      )}
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
    </Box>
  );
}
