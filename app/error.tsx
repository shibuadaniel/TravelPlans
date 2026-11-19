"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <Box sx={{ px: 2, py: 4 }}>
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={reset}>
            Try again
          </Button>
        }
      >
        Something went wrong opening this page.
      </Alert>
    </Box>
  );
}
