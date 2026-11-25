import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Vivaah AI — Meaningful by Design", description: "Thoughtful, privacy-first matchmaking with explainable compatibility." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
