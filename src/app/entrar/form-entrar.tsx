"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Abas } from "@/components/abas";
import { Aviso, Botao, Campo } from "@/components/ui";
import { mascararTelefone, telefoneParaE164, traduzirErro } from "@/lib/formatar";
import { criarClienteNavegador } from "@/lib/supabase/client";

type Modo = "celular" | "email";

export function FormEntrar() {
  const router = useRouter();
  const supabase = criarClienteNavegador();
  const [modo, setModo] = useState<Modo>("celular");
  const [telefone, setTelefone] = useState("");
  const [codigo, setCodigo] = useState("");
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function enviarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const tel = telefoneParaE164(telefone);
    if (!tel) return setErro("Digite o celular com DDD. Exemplo: (81) 99999-0000.");
    setCarregando(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: tel, options: { shouldCreateUser: false } });
    setCarregando(false);
    if (error) return setErro(traduzirErro(error.message));
    setCodigoEnviado(true);
    setInfo("Enviamos um código por SMS. Ele chega em até 1 minuto.");
  }

  async function confirmarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: telefoneParaE164(telefone)!,
      token: codigo.trim(),
      type: "sms",
    });
    setCarregando(false);
    if (error) return setErro(traduzirErro(error.message));
    router.replace("/");
    router.refresh();
  }

  async function entrarEmail(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setCarregando(false);
    if (error) return setErro(traduzirErro(error.message));
    router.replace("/");
    router.refresh();
  }

  async function esqueciSenha() {
    setErro(null);
    if (!email.includes("@")) return setErro("Digite seu e-mail no campo acima e toque de novo em “Esqueci a senha”.");
    setCarregando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/nova-senha`,
    });
    setCarregando(false);
    if (error) return setErro(traduzirErro(error.message));
    setInfo("Se este e-mail tiver cadastro, você vai receber um link para criar uma nova senha.");
  }

  return (
    <div className="flex flex-col gap-5">
      <Abas
        rotulo="Forma de entrar"
        valor={modo}
        aoMudar={(v) => {
          setModo(v);
          setErro(null);
          setInfo(null);
        }}
        opcoes={[
          { valor: "celular", texto: "Pelo celular" },
          { valor: "email", texto: "Pelo e-mail" },
        ]}
      />

      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
      {info && !erro ? <Aviso tipo="sucesso">{info}</Aviso> : null}

      {modo === "celular" && !codigoEnviado ? (
        <form onSubmit={enviarCodigo} className="flex flex-col gap-4">
          <Campo
            id="telefone"
            rotulo="Seu celular"
            ajuda="Com DDD. Vamos mandar um código por SMS."
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(81) 99999-0000"
            value={telefone}
            onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
            required
          />
          <Botao type="submit" carregando={carregando}>Receber código por SMS</Botao>
        </form>
      ) : null}

      {modo === "celular" && codigoEnviado ? (
        <form onSubmit={confirmarCodigo} className="flex flex-col gap-4">
          <Campo
            id="codigo"
            rotulo="Código recebido por SMS"
            ajuda={`Enviado para ${telefone}.`}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="000000"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
            className="[&_input]:text-center [&_input]:text-2xl [&_input]:tracking-[0.4em]"
            required
          />
          <Botao type="submit" carregando={carregando}>Entrar</Botao>
          <Botao type="button" variante="texto" onClick={() => { setCodigoEnviado(false); setCodigo(""); setInfo(null); }}>
            Trocar número ou pedir novo código
          </Botao>
        </form>
      ) : null}

      {modo === "email" ? (
        <form onSubmit={entrarEmail} className="flex flex-col gap-4">
          <Campo id="email" rotulo="E-mail" type="email" autoComplete="email" inputMode="email"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Campo id="senha" rotulo="Senha" type="password" autoComplete="current-password"
            value={senha} onChange={(e) => setSenha(e.target.value)} required />
          <Botao type="submit" carregando={carregando}>Entrar</Botao>
          <Botao type="button" variante="texto" onClick={esqueciSenha}>Esqueci a senha</Botao>
        </form>
      ) : null}
    </div>
  );
}
