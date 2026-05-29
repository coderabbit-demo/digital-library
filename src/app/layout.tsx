import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { appConfig } from "@/lib/app-config";

export const metadata: Metadata = {
  title: appConfig.name,
  description: appConfig.tagline,
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
