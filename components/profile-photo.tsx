"use client";

import Box from "@mui/material/Box";
import { useEffect, useState } from "react";
import { pastelGradient } from "@/lib/format";

export function ProfilePhoto({ src, size = 48, initial }: { src?: string; size?: number; initial?: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = Boolean(src) && !failed;

  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        overflow: "hidden",
        background: pastelGradient("where-are-we"),
      }}
    >
      {showImage ? (
        <Box
          component="img"
          src={src}
          alt=""
          onError={() => setFailed(true)}
          sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : initial ? (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "grid",
            placeItems: "center",
            color: "text.primary",
            fontWeight: 700,
            fontSize: size * 0.42,
          }}
        >
          {initial}
        </Box>
      ) : null}
    </Box>
  );
}
