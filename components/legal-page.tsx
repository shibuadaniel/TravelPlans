import Box from "@mui/material/Box";
import MuiLink from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ px: 2, pt: 3, pb: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        {title}
      </Typography>
      <Box sx={{ display: "grid", gap: 2, "& p": { m: 0 } }}>{children}</Box>
      <Typography variant="body2" sx={{ mt: 3 }}>
        <MuiLink component={NextLink} href="/auth/sign-in">
          Back to sign in
        </MuiLink>
      </Typography>
    </Box>
  );
}
