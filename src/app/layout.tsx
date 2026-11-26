import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegistrarServiceWorker } from "@/components/registrar-sw";

export const metadata: Metadata = {
  title: { default: "Ignez Andreazza", template: "%s · Ignez Andreazza" },
  description: "Aplicativo dos moradores do Condomínio Ignez Andreazza — Areias, Recife (PE).",
  applicationName: "Ignez Andreazza",
  appleWebApp: { capable: true, title: "Ignez Andreazza", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f663b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap"
        />
      </head>
      <body className="min-h-dvh antialiased">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:p-3"
        >
          Pular para o conteúdo
        </a>
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
