"use client";

import Box from "@mui/material/Box";
import { useEffect, useState } from "react";
import { pastelGradient } from "@/lib/format";

export function ProfilePhoto({ src, size = 48 }: { src?: string; size?: number }) {
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
      ) : null}
    </Box>
  );
}
