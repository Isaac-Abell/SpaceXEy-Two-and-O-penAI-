// Dark Material theme. Google-style dark surfaces, Google-blue accent for
// chrome; the player CARDS still carry their own attribute-based colors.
import { createTheme } from "@mui/material/styles";

// Shared surface tokens so components don't hardcode hex all over.
export const surfaces = {
  bg: "#0e1015",
  paper: "#171a21",
  paperRaised: "#1e222b",
  border: "#2a2f3a",
  track: "rgba(255,255,255,0.10)", // stat-bar track
};

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#8ab4f8" }, // Google blue (dark)
    secondary: { main: "#9aa0a6" },
    background: { default: surfaces.bg, paper: surfaces.paper },
    text: { primary: "#e8eaed", secondary: "#9aa0a6" },
    divider: surfaces.border,
    success: { main: "#81c995" },
    error: { main: "#f28b82" },
    warning: { main: "#fdd663" },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Google Sans","Roboto","Helvetica","Arial",sans-serif',
    h4: { fontWeight: 600, letterSpacing: "-0.5px" },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 999, paddingInline: 20 } },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: surfaces.paper,
          color: "#e8eaed",
          borderBottom: `1px solid ${surfaces.border}`,
        },
      },
      defaultProps: { elevation: 0 },
    },
    MuiOutlinedInput: {
      styleOverrides: { notchedOutline: { borderColor: surfaces.border } },
    },
  },
});
