"use client";
import { useEffect, useState } from "react";

interface EventoInstalacao extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Mostra "Instalar no celular" no Android/Chrome e uma dica no iPhone. */
export function BotaoInstalar() {
  const [evento, setEvento] = useState<EventoInstalacao | null>(null);
  const [ios, setIos] = useState(false);
  const [instalado, setInstalado] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalado(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const h = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalacao);
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  if (instalado) return null;
  if (evento)
    return (
      <button
        onClick={async () => {
          await evento.prompt();
          setEvento(null);
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-marca-500 bg-marca-50 p-4 text-base font-bold text-marca-800"
      >
        📲 Instalar o aplicativo no celular
      </button>
    );
  if (ios)
    return (
      <p className="rounded-xl border-2 border-dashed border-marca-500 bg-marca-50 p-4 text-base text-marca-900">
        📲 <strong>Para instalar no iPhone:</strong> toque em <strong>Compartilhar</strong> (quadrado com
        seta) e depois em <strong>Adicionar à Tela de Início</strong>.
      </p>
    );
  return null;
}
