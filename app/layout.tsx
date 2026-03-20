import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Exam Planner",
  description: "Google Sheets powered study planner for exam preparation",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
