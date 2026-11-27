// Teste ponta a ponta do login com aprovação (Bloco → Prédio → Apto).
// Requer: npx supabase start; app em :3000 (npm run build && npm start).
// Uso: node tests/e2e-login-aprovacao.cjs   (gera capturas em docs/telas)
const { chromium } = require("playwright");
const { execSync } = require("child_process");
const BASE = "http://localhost:3000";
const OUT = __dirname + "/../docs/telas";
const sql = (q) => execSync(`psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const ok = (c, m) => { if (!c) throw new Error("FALHOU: " + m); console.log("✔", m); };
const aceitar = (p) => p.locator("label:has-text('Li e aceito') input").check();

(async () => {
  sql("delete from auth.users; delete from public.unidades; delete from public.predios; delete from public.blocos; update public.configuracoes set valor='false' where chave='lista_oficial_importada'");
  const b = await chromium.launch();
  const novo = () => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "pt-BR" });
  const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });

  let ctx = await novo(); let p = await ctx.newPage();
  await p.goto(BASE + "/inicio"); ok(p.url().endsWith("/entrar"), "sem login → /entrar");
  await shot(p, "01-entrar");

  // Cadastro por SMS (sem lista oficial: não há aviso de endereço)
  await p.goto(BASE + "/cadastro");
  await p.fill("#nome", "Maria das Dores Silva");
  await p.fill("#bloco", "05"); await p.fill("#predio", "Prédio 3"); await p.fill("#apto", "102");
  await p.fill("#telefone", "81999990001");
  await aceitar(p);
  await shot(p, "02-cadastro");
  await p.click("button[type=submit]");
  await p.waitForSelector("#codigo");
  await p.fill("#codigo", "123456");
  await p.click("text=Confirmar cadastro");
  await p.waitForURL("**/aguardando");
  ok(await p.isVisible("text=Bloco 05 · Prédio 3 · Apto 102"), "Maria → aguardando, sem \"Prédio Prédio\"");
  await shot(p, "03-aguardando");
  await ctx.close();

  // Síndica por e-mail, liberada no banco (sem endereço ainda)
  ctx = await novo(); p = await ctx.newPage();
  await p.goto(BASE + "/cadastro");
  await p.fill("#nome", "Sônia Albuquerque");
  await p.fill("#bloco", "1"); await p.fill("#predio", "1"); await p.fill("#apto", "101");
  await p.click("text=E-mail e senha");
  await p.fill("#email", "sindica@teste.local"); await p.fill("#senha", "senha-forte-123");
  await aceitar(p);
  await p.click("button[type=submit]");
  await p.waitForURL("**/aguardando");
  sql(`update public.perfis set status='aprovado' where email='sindica@teste.local';
       insert into public.papeis_usuario (usuario_id, papel) select id, unnest(array['morador','sindico']::public.papel_usuario[]) from auth.users where email='sindica@teste.local';`);
  await p.goto(BASE + "/");
  await p.waitForURL("**/inicio");
  ok(await p.isVisible("text=1 cadastro aguardando aprovação"), "síndica vê pendência");
  await p.goto(BASE + "/admin"); await shot(p, "04-admin");
  ok(await p.isVisible("text=23 blocos · 176 prédios · 2.464 apartamentos"), "painel mostra estrutura real");
  await p.goto(BASE + "/admin/aprovacoes");
  ok(await p.isVisible("text=lista oficial de apartamentos ainda não foi importada"), "aviso de lista não importada");
  await shot(p, "05-aprovacoes");
  await p.click("button:has-text('Aprovar')");
  await p.waitForSelector("text=foi aprovado(a)");
  ok(sql("select b.nome||'/'||pr.nome||'/'||u.numero from public.perfis p join public.unidades u on u.id=p.unidade_id join public.predios pr on pr.id=u.predio_id join public.blocos b on b.id=pr.bloco_id where p.nome like 'Maria%'") === "5/3/102", "aprovada no Bloco 5 / Prédio 3 / Apto 102 (canônico)");

  // Síndica define o próprio endereço e dá papel à Maria
  await p.goto(BASE + "/admin/usuarios"); await p.click("text=Sônia Albuquerque");
  await p.click("button:has-text('Salvar endereço')");
  await p.waitForSelector("text=Endereço atualizado");
  await p.goto(BASE + "/admin/usuarios"); await p.click("text=Maria das Dores Silva");
  await p.check("text=Prestador(a) de serviço"); await p.click("text=Salvar funções");
  await p.waitForSelector("text=Funções atualizadas");
  await shot(p, "06-usuarios");

  // Importa a lista oficial
  await p.goto(BASE + "/admin/estrutura");
  await p.fill("#lista", "bloco;predio;apto\n5;3;102\n5;3;201\n1;1;101\n23;8;404");
  await p.click("button:has-text('Importar')");
  await p.waitForSelector("text=Importação concluída");
  ok(sql("select count(*) from public.unidades") === "4", "lista importada sem duplicar");
  await shot(p, "07-estrutura");
  await ctx.close();

  // Com lista oficial, endereço inexistente gera aviso no cadastro
  ctx = await novo(); p = await ctx.newPage();
  await p.goto(BASE + "/cadastro");
  await p.fill("#nome", "José Teste Silva");
  await p.fill("#bloco", "99"); await p.fill("#predio", "1"); await p.fill("#apto", "101");
  await p.fill("#telefone", "81999990002");
  await aceitar(p);
  await p.click("button[type=submit]");
  await p.waitForSelector("text=Não encontramos este endereço");
  ok(true, "aviso de endereço fora da lista");
  await ctx.close();

  // Maria entra pelo celular
  ctx = await novo(); p = await ctx.newPage();
  await p.goto(BASE + "/entrar");
  await p.fill("#telefone", "81999990001");
  await p.click("text=Receber código por SMS");
  if (!(await p.waitForSelector("#codigo", { timeout: 5000 }).catch(() => null))) {
    await p.waitForTimeout(61000);
    await p.click("text=Receber código por SMS");
  }
  await p.fill("#codigo", "123456");
  await p.click("button:has-text('Entrar')");
  await p.waitForURL("**/inicio");
  ok(await p.isVisible("text=Bloco 5 · Prédio 3 · Apto 102"), "cabeçalho com bloco, prédio e apto");
  ok(!(await p.isVisible("nav >> text=Administração")), "morador não vê administração");
  await shot(p, "08-inicio-morador");
  await p.goto(BASE + "/perfil");
  await shot(p, "09-perfil");
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("text=Baixar meus dados")]);
  ok((await dl.suggestedFilename()).endsWith(".json"), "exportação LGPD");
  await p.click("text=Excluir minha conta");
  await p.fill("#confirma-excluir", "EXCLUIR");
  await p.click("text=Excluir definitivamente");
  await p.waitForURL("**/entrar");
  ok(sql("select count(*) from auth.users where phone='5581999990001'") === "0", "conta excluída");
  await b.close();
  console.log("E2E OK");
})().catch((e) => { console.error(e); process.exit(1); });
