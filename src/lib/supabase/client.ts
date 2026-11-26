"use client";
import { createBrowserClient } from "@supabase/ssr";

export function criarClienteNavegador() {
  // Os valores provisórios só permitem o build antes de o banco ser conectado;
  // nesse caso o middleware mostra a página "em configuração" e o cliente não é usado.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://banco-nao-configurado.invalid",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "nao-configurado",
  );
}
