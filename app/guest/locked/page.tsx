import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export const metadata = { title: "Where are we?" };

export default function ShareLockedPage() {
  return (
    <Box sx={{ px: 2, py: 4 }}>
      <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
        Where are we?
      </Typography>
      <Alert severity="info">The trip owner needs to set a PIN before this link opens.</Alert>
    </Box>
  );
}
