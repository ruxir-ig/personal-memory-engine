import localFont from "next/font/local";

export const nudica = localFont({
  src: [
    {
      path: "./nudica/Nudica-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./nudica/Nudica-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./nudica/Nudica-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-nudica",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});
