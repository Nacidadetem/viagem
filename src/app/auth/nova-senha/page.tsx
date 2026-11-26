"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutPublico } from "@/components/layout-publico";
import { Aviso, Botao, Campo } from "@/components/ui";
import { traduzirErro } from "@/lib/formatar";
import { criarClienteNavegador } from "@/lib/supabase/client";

export default function NovaSenha() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    setCarregando(true);
    const { error } = await criarClienteNavegador().auth.updateUser({ password: senha });
    setCarregando(false);
    if (error) return setErro(traduzirErro(error.message));
    router.replace("/");
  }

  return (
    <LayoutPublico titulo="Criar nova senha">
      <form onSubmit={salvar} className="flex flex-col gap-4">
        {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
        <Campo id="senha" rotulo="Nova senha" ajuda="Pelo menos 8 caracteres." type="password"
          autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        <Botao type="submit" carregando={carregando}>Salvar nova senha</Botao>
      </form>
    </LayoutPublico>
  );
}
