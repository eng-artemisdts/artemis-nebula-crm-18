import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Artemis Nebula CRM",
  description: "CRM do futuro para seu negócio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
