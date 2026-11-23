"use client";

import { createTheme } from "@mui/material/styles";

const sans = 'var(--font-sans), "Inter", "Segoe UI", sans-serif';

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "media" },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#0f4c5c", contrastText: "#ffffff" },
        secondary: { main: "#e36414" },
        background: { default: "#f4f7f8", paper: "#ffffff" },
        text: { primary: "#102a33" },
      },
    },
    dark: {
      palette: {
        primary: { main: "#9fd3de", contrastText: "#102a33" },
        secondary: { main: "#f0823a" },
        background: { default: "#0f171b", paper: "#18262d" },
        text: { primary: "#e7eef1" },
      },
    },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: sans,
    button: { textTransform: "none", fontWeight: 600 },
    h1: { fontFamily: sans, fontWeight: 400 },
    h2: { fontFamily: sans, fontWeight: 400 },
    h3: { fontFamily: sans, fontWeight: 400 },
    h4: { fontFamily: sans, fontWeight: 400 },
    h5: { fontFamily: sans, fontWeight: 400 },
    h6: { fontFamily: sans, fontWeight: 400 },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        colorPrimary: { backgroundColor: "#0f4c5c", color: "#ffffff" },
      },
    },
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
