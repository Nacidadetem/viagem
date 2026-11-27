"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Abas } from "@/components/abas";
import { Aviso, Botao, Campo } from "@/components/ui";
import { CampoSenha } from "@/components/campo-senha";
import { limparRef, mascararTelefone, telefoneParaE164, traduzirErro } from "@/lib/formatar";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { VERSAO_TERMOS, type TipoVinculo } from "@/lib/tipos";

type Acesso = "celular" | "email";
type Etapa = "dados" | "codigo" | "confirme-email";

/**
 * modo "novo": cria login + perfil (signUp / signInWithOtp com os dados).
 * modo "completar": a pessoa já está logada (ex.: entrou por SMS) e só envia os dados.
 */
export function FormCadastro({
  modo,
  inicial,
}: {
  modo: "novo" | "completar";
  inicial?: { nome?: string; bloco?: string; predio?: string; apartamento?: string; tipo?: TipoVinculo };
}) {
  const router = useRouter();
  const supabase = criarClienteNavegador();
  const [etapa, setEtapa] = useState<Etapa>("dados");
  const [acesso, setAcesso] = useState<Acesso>("celular");
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [bloco, setBloco] = useState(inicial?.bloco ?? "");
  const [predio, setPredio] = useState(inicial?.predio ?? "");
  const [apto, setApto] = useState(inicial?.apartamento ?? "");
  const [tipo, setTipo] = useState<TipoVinculo>(inicial?.tipo ?? "titular");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [aceiteTermos, setAceiteTermos] = useState(false);
  const [aceiteNotif, setAceiteNotif] = useState(true);
  const [aceiteParceiros, setAceiteParceiros] = useState(false);
  const [unidadeDuvidosa, setUnidadeDuvidosa] = useState(false);
  const [confirmaUnidade, setConfirmaUnidade] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (nome.trim().split(/\s+/).length < 2) return setErro("Digite seu nome completo (nome e sobrenome).");
    if (!bloco.trim() || !predio.trim() || !apto.trim()) return setErro("Informe o bloco, o prédio e o apartamento.");
    if (!aceiteTermos) return setErro("Para continuar, marque que leu e aceita os termos e a política de privacidade.");

    setCarregando(true);
    // Confere se o endereço existe (sem expor dados de ninguém). Devolve null
    // enquanto a lista oficial não foi importada: aí a administração confere.
    const { data: existe } = await supabase.rpc("unidade_existe", { p_bloco: bloco, p_predio: predio, p_numero: apto });
    if (existe === false && !confirmaUnidade) {
      setCarregando(false);
      setUnidadeDuvidosa(true);
      return;
    }

    const dados = {
      nome: nome.trim(),
      bloco: limparRef(bloco),
      predio: limparRef(predio),
      apartamento: limparRef(apto),
      tipo_vinculo: tipo,
      aceite_termos: true,
      aceite_notificacoes: aceiteNotif,
      aceite_parceiros: aceiteParceiros,
      versao_termos: VERSAO_TERMOS,
    };

    if (modo === "completar") {
      const { error } = await supabase.rpc("completar_cadastro", {
        p_nome: dados.nome,
        p_bloco: dados.bloco,
        p_predio: dados.predio,
        p_apartamento: dados.apartamento,
        p_tipo: tipo,
        p_aceite_termos: true,
        p_aceite_notificacoes: aceiteNotif,
        p_aceite_parceiros: aceiteParceiros,
        p_versao: VERSAO_TERMOS,
      });
      setCarregando(false);
      if (error) return setErro(traduzirErro(error.message));
      router.replace("/aguardando");
      router.refresh();
      return;
    }

    if (acesso === "celular") {
      const tel = telefoneParaE164(telefone);
      if (!tel) {
        setCarregando(false);
        return setErro("Digite o celular com DDD. Exemplo: (81) 99999-0000.");
      }
      const { error } = await supabase.auth.signInWithOtp({
        phone: tel,
        options: { shouldCreateUser: true, data: { ...dados, telefone: tel } },
      });
      setCarregando(false);
      if (error) return setErro(traduzirErro(error.message));
      setEtapa("codigo");
    } else {
      if (senha.length < 8) {
        setCarregando(false);
        return setErro("A senha precisa ter pelo menos 8 caracteres.");
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
        options: { data: dados, emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setCarregando(false);
      if (error) return setErro(traduzirErro(error.message));
      if (data.session) {
        router.replace("/aguardando");
        router.refresh();
      } else setEtapa("confirme-email");
    }
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

  if (etapa === "confirme-email")
    return (
      <Aviso tipo="sucesso" titulo="Quase lá! Confirme seu e-mail.">
        Enviamos um link para <strong>{email}</strong>. Abra o e-mail e toque no link. Depois disso, a
        administração vai conferir seu endereço e liberar seu acesso.
      </Aviso>
    );

  if (etapa === "codigo")
    return (
      <form onSubmit={confirmarCodigo} className="flex flex-col gap-4">
        {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
        <Aviso tipo="sucesso">Enviamos um código por SMS para {telefone}.</Aviso>
        <Campo
          id="codigo"
          rotulo="Código recebido por SMS"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
          className="[&_input]:text-center [&_input]:text-2xl [&_input]:tracking-[0.4em]"
          required
        />
        <Botao type="submit" carregando={carregando}>Confirmar cadastro</Botao>
        <Botao type="button" variante="texto" onClick={() => setEtapa("dados")}>Voltar e corrigir</Botao>
      </form>
    );

  return (
    <form onSubmit={enviar} className="flex flex-col gap-6" noValidate>
      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-xl font-bold text-marca-900">1. Seus dados</legend>
        <Campo id="nome" rotulo="Nome completo" autoComplete="name" value={nome}
          onChange={(e) => setNome(e.target.value)} required />
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Campo id="bloco" rotulo="Bloco" placeholder="Ex.: 5" autoComplete="off" value={bloco}
            onChange={(e) => { setBloco(e.target.value); setUnidadeDuvidosa(false); setConfirmaUnidade(false); }} required />
          <Campo id="predio" rotulo="Prédio" placeholder="Ex.: 3" autoComplete="off" value={predio}
            onChange={(e) => { setPredio(e.target.value); setUnidadeDuvidosa(false); setConfirmaUnidade(false); }} required />
          <Campo id="apto" rotulo="Apto" placeholder="Ex.: 102" inputMode="numeric" autoComplete="off" value={apto}
            onChange={(e) => { setApto(e.target.value); setUnidadeDuvidosa(false); setConfirmaUnidade(false); }} required />
        </div>
        {unidadeDuvidosa ? (
          <Aviso tipo="atencao" titulo="Não encontramos este endereço na lista do condomínio.">
            <p>Confira se digitou certo. Se estiver correto, marque abaixo e envie: a administração vai verificar.</p>
            <label className="mt-3 flex items-start gap-3">
              <input type="checkbox" className="mt-1 size-6 accent-marca-700" checked={confirmaUnidade}
                onChange={(e) => setConfirmaUnidade(e.target.checked)} />
              <span>Está certo, pode enviar assim.</span>
            </label>
          </Aviso>
        ) : null}
        <div className="flex flex-col gap-2">
          <span className="text-base font-bold" id="tipo-rotulo">Você é</span>
          <div role="radiogroup" aria-labelledby="tipo-rotulo" className="grid grid-cols-2 gap-3">
            {([
              ["titular", "Titular", "Proprietário(a) ou inquilino(a) responsável"],
              ["dependente", "Dependente", "Mora com o titular (família)"],
            ] as const).map(([v, t, d]) => (
              <label key={v}
                className={`flex cursor-pointer flex-col rounded-xl border-2 p-3 ${tipo === v ? "border-marca-700 bg-marca-50" : "border-linha bg-white"}`}>
                <span className="flex items-center gap-2 font-bold">
                  <input type="radio" name="tipo" value={v} checked={tipo === v} onChange={() => setTipo(v)}
                    className="size-5 accent-marca-700" />
                  {t}
                </span>
                <span className="text-sm text-suave">{d}</span>
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      {modo === "novo" ? (
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-xl font-bold text-marca-900">2. Como você vai entrar</legend>
          <Abas rotulo="Forma de acesso" valor={acesso} aoMudar={setAcesso}
            opcoes={[{ valor: "celular", texto: "Celular (SMS)" }, { valor: "email", texto: "E-mail e senha" }]} />
          {acesso === "celular" ? (
            <Campo id="telefone" rotulo="Celular com DDD" type="tel" inputMode="tel" autoComplete="tel-national"
              placeholder="(81) 99999-0000" value={telefone}
              onChange={(e) => setTelefone(mascararTelefone(e.target.value))} required />
          ) : (
            <>
              <Campo id="email" rotulo="E-mail" type="email" autoComplete="email" inputMode="email"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
              <CampoSenha id="senha" rotulo="Crie uma senha" ajuda="Pelo menos 8 caracteres."
                autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
            </>
          )}
        </fieldset>
      ) : null}

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-xl font-bold text-marca-900">{modo === "novo" ? "3." : "2."} Privacidade</legend>
        <p className="text-sm text-suave">
          Pedimos só o necessário: nome, contato e apartamento. Não pedimos CPF nem documentos.
        </p>
        {([
          [aceiteTermos, setAceiteTermos, <>Li e aceito os <Link href="/termos" target="_blank" className="font-bold underline">termos de uso</Link> e a <Link href="/privacidade" target="_blank" className="font-bold underline">política de privacidade</Link>. <strong>(obrigatório)</strong></>],
          [aceiteNotif, setAceiteNotif, <>Quero receber avisos do condomínio no celular (comunicados, encomendas, chamados).</>],
          [aceiteParceiros, setAceiteParceiros, <>Aceito receber ofertas de parceiros do condomínio (opcional — pode mudar depois).</>],
        ] as const).map(([valor, mudar, texto], i) => (
          <label key={i} className="flex items-start gap-3 rounded-xl border border-linha bg-white p-3">
            <input type="checkbox" className="mt-1 size-6 shrink-0 accent-marca-700" checked={valor}
              onChange={(e) => mudar(e.target.checked)} />
            <span className="text-base">{texto}</span>
          </label>
        ))}
      </fieldset>

      <Botao type="submit" carregando={carregando}>
        {modo === "completar" ? "Enviar para aprovação" : acesso === "celular" ? "Continuar e receber código" : "Criar cadastro"}
      </Botao>
      <p className="text-center text-sm text-suave">
        Depois de enviar, a administração confere seu endereço. Você recebe um aviso quando for liberado.
      </p>
    </form>
  );
}
