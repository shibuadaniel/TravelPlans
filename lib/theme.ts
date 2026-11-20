"use client";

import { createTheme } from "@mui/material/styles";

const sans = 'var(--font-sans), "Source Sans 3", "Segoe UI", sans-serif';
const serif = 'var(--font-serif), Georgia, "Times New Roman", serif';

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0f4c5c" },
    secondary: { main: "#e36414" },
    background: { default: "#f4f7f8", paper: "#ffffff" },
    text: { primary: "#102a33" },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: sans,
    button: { textTransform: "none", fontWeight: 600 },
    h1: { fontFamily: serif, fontWeight: 600 },
    h2: { fontFamily: serif, fontWeight: 600 },
    h3: { fontFamily: serif, fontWeight: 600 },
    h4: { fontFamily: serif, fontWeight: 600 },
    h5: { fontFamily: serif, fontWeight: 600 },
    h6: { fontFamily: serif, fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { size: "small", disableElevation: true },
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, minHeight: 36 },
      },
    },
    MuiIconButton: { defaultProps: { size: "small" } },
    MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
    MuiFormControl: { defaultProps: { size: "small", fullWidth: true } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          ".MuiFormControl-root:has(.MuiInputLabel-shrink) & .MuiOutlinedInput-notchedOutline legend": {
            width: "fit-content !important",
            maxWidth: "100% !important",
          },
          ".MuiFormControl-root:has(.MuiInputLabel-shrink) & .MuiOutlinedInput-notchedOutline": {
            paddingLeft: 6,
          },
          ".MuiFormControl-root:has(.MuiInputLabel-shrink) & .MuiOutlinedInput-notchedOutline legend span": {
            paddingLeft: 8,
            paddingRight: 8,
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: { textAlign: "left" },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          minHeight: 44,
          "&.Mui-expanded": { minHeight: 44 },
        },
        content: {
          margin: "8px 0",
          alignItems: "center",
          "&.Mui-expanded": { margin: "8px 0" },
        },
      },
    },
  },
});
