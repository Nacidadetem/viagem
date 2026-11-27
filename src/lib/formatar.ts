/** Converte o que a pessoa digitou ("(81) 99999-0000") para o formato E.164 (+5581999990000). */
export function telefoneParaE164(entrada: string): string | null {
  let d = entrada.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length !== 10 && d.length !== 11) return null;
  return `+55${d}`;
}

export function mascararTelefone(entrada: string): string {
  const d = entrada.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function dataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Recife",
  });
}

/** Traduz mensagens de erro comuns do Supabase para português simples. */
export function traduzirErro(msg: string | undefined | null): string {
  if (!msg) return "Algo deu errado. Tente de novo.";
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (m.includes("user already registered")) return "Este e-mail já tem cadastro. Use a opção Entrar.";
  if (m.includes("password should be at least")) return "A senha precisa ter pelo menos 8 caracteres.";
  if (m.includes("token has expired") || m.includes("invalid otp") || m.includes("otp"))
    return "Código inválido ou vencido. Peça um novo código.";
  if (m.includes("for security purposes"))
    return "Por segurança, espere 1 minuto antes de pedir outro código.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
  if (m.includes("signups not allowed for otp") || m.includes("user not found"))
    return "Não encontramos cadastro com este celular. Faça seu cadastro primeiro.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Sem conexão com a internet. Verifique e tente de novo.";
  return msg;
}

/** Exibe telefone salvo ("5581999990001" ou "+55…") como "(81) 99999-0001". */
export function exibirTelefone(t: string | null | undefined): string {
  if (!t) return "";
  let d = t.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  return mascararTelefone(d);
}

/** Tira prefixos digitados pelo morador: "Prédio 3" → "3", "Bl. 05" → "05", "apto 102" → "102". */
export function limparRef(txt: string | null | undefined): string {
  return (txt ?? "")
    .trim()
    .replace(/^(bloco|bl\.?|pr[eé]dio|pr\.?|edif[ií]cio|ed\.?|apartamento|apto?\.?)\s*/i, "")
    .trim();
}

/** "Bloco 5 · Prédio 3 · Apto 102" (partes vazias são omitidas). */
export function endereco(bloco?: string | null, predio?: string | null, apto?: string | null): string {
  const [b, p, a] = [bloco, predio, apto].map(limparRef);
  return [b && `Bloco ${b}`, p && `Prédio ${p}`, a && `Apto ${a}`].filter(Boolean).join(" · ");
}
