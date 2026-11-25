import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

const twoColumns = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  "& > *": { minWidth: 0 },
} as const;

export function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ ...twoColumns, columnGap: 1.25, rowGap: 1.25 }}>
      {children}
    </Box>
  );
}

export function FormGrid({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ ...twoColumns, columnGap: 1.5, rowGap: 1.5 }}>
      {children}
    </Box>
  );
}

export function Field({
  label,
  value,
  full = false,
  nowrap = false,
}: {
  label: string;
  value?: string | null;
  full?: boolean;
  nowrap?: boolean;
}) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  const wide = full || trimmed.includes("\n") || trimmed.length > 42 || trimmed.includes("@") || trimmed.startsWith("http");
  return (
    <Box sx={{ gridColumn: wide ? "1 / -1" : "auto", minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" component="div">
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={
          nowrap && !wide
            ? { whiteSpace: "nowrap" }
            : { whiteSpace: "pre-wrap", overflowWrap: "anywhere" }
        }
      >
        {trimmed}
      </Typography>
    </Box>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="body2" color="text.secondary">
      {children}
    </Typography>
  );
}
