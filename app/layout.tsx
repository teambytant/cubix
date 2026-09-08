import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CubeSense | See every move",
  description: "A visual tutor for solving your Rubik's Cube.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
