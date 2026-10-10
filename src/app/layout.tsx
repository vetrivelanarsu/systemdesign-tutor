import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SystemDesign Tutor",
  description: "Build the foundations. Explain the trade-offs. Earn your progress.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
