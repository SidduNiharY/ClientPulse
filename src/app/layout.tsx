import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reports Generator",
  description: "Internal agency reporting dashboard"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
try {
  var theme = window.localStorage.getItem("reports-generator-theme");
  if (theme === "light" || theme === "dark") {
    document.documentElement.dataset.theme = theme;
  }
} catch (_) {}
`
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
