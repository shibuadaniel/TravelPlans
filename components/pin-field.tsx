"use client";

import TextField from "@mui/material/TextField";
import { useState } from "react";

export function PinField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const filled = focused || value.length > 0;

  return (
    <TextField
      label={label}
      value={value}
      type="text"
      required
      autoComplete="off"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 8))}
      placeholder=" "
      sx={{
        "& input": { WebkitTextSecurity: "disc" },
        "& input::placeholder": { WebkitTextSecurity: "none", color: "transparent" },
        "&:focus-within .MuiInputLabel-outlined, &:has(.MuiOutlinedInput-input:not(:placeholder-shown)) .MuiInputLabel-outlined": {
          transform: "translate(14px, -9px) scale(0.75) !important",
        },
      }}
      slotProps={{
        inputLabel: { shrink: filled },
        htmlInput: {
          inputMode: "numeric",
          maxLength: 8,
          autoComplete: "off",
          autoCorrect: "off",
          spellCheck: false,
        },
      }}
    />
  );
}
