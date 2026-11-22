import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export function InvalidShare() {
  return (
    <Box sx={{ px: 2, py: 4 }}>
      <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
        Reveal
      </Typography>
      <Alert severity="warning">Open a valid share link from the trip owner.</Alert>
    </Box>
  );
}
