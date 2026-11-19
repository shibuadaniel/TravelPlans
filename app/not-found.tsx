import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function NotFound() {
  return (
    <Box sx={{ px: 2, py: 4 }}>
      <Typography variant="h5" component="h1">
        That page is not available.
      </Typography>
    </Box>
  );
}
