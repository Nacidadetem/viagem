"use client";
import { useEffect } from "react";

/** Aplica a preferência de letras grandes salva no perfil. */
export function AplicarFonteGrande({ ativo }: { ativo: boolean }) {
  useEffect(() => {
    document.documentElement.classList.toggle("fonte-grande", ativo);
  }, [ativo]);
  return null;
}
