// Teste ponta a ponta do login com aprovação. Requer: supabase start, app em :3000 (npm run build && npm start).
// Uso: node tests/e2e-login-aprovacao.cjs  (gera capturas em docs/telas)
const { chromium } = require("playwright");
const { execSync } = require("child_process");
const BASE = "http://localhost:3000";
const OUT = "/home/user/viagem/docs/telas";
const sql = (q) => execSync(`psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const ok = (c, m) => { if (!c) throw new Error("FALHOU: " + m); console.log("✔", m); };

(async () => {
  const b = await chromium.launch();
  const novo = () => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "pt-BR" });
  const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });

  // 1) Tela de login
  let ctx = await novo(); let p = await ctx.newPage();
  await p.goto(BASE + "/inicio"); ok(p.url().endsWith("/entrar"), "sem login → /entrar");
  await shot(p, "01-entrar");

  // 2) Cadastro com apartamento inexistente mostra aviso
  await p.goto(BASE + "/cadastro");
  await p.fill("#nome", "Maria das Dores Silva");
  await p.fill("#bloco", "999"); await p.fill("#apto", "203");
  await p.fill("#telefone", "81999990001");
  await p.locator("label:has-text('Li e aceito') input").check();
  await p.click("button[type=submit]");
  await p.waitForSelector("text=Não encontramos este bloco");
  ok(true, "aviso de bloco/apto inexistente");
  await shot(p, "02-cadastro-aviso");

  // 3) Cadastro correto por SMS
  await p.fill("#bloco", "07");
  await p.click("button[type=submit]");
  await p.waitForSelector("#codigo");
  await p.fill("#codigo", "123456");
  await p.click("text=Confirmar cadastro");
  await p.waitForURL("**/aguardando");
  ok(await p.isVisible("text=Seu cadastro está em análise"), "Maria cadastrada por SMS → aguardando");
  await shot(p, "03-aguardando");
  await p.goto(BASE + "/inicio"); ok(p.url().endsWith("/aguardando"), "pendente não acessa /inicio");
  await ctx.close();

  // 4) Síndica se cadastra por e-mail e é promovida no banco (passo manual do seed)
  ctx = await novo(); p = await ctx.newPage();
  await p.goto(BASE + "/cadastro");
  await p.fill("#nome", "Sônia Albuquerque");
  await p.fill("#bloco", "01"); await p.fill("#apto", "101");
  await p.click("text=E-mail e senha");
  await p.fill("#email", "sindica@teste.local"); await p.fill("#senha", "senha-forte-123");
  await p.locator("label:has-text('Li e aceito') input").check();
  await p.click("button[type=submit]");
  await p.waitForURL("**/aguardando");
  sql(`update public.perfis set status='aprovado', unidade_id=public.buscar_unidade('01','101') where email='sindica@teste.local';
       insert into public.papeis_usuario (usuario_id, papel) select id, unnest(array['morador','sindico']::public.papel_usuario[]) from auth.users where email='sindica@teste.local';`);
  await p.goto(BASE + "/");
  await p.waitForURL("**/inicio");
  ok(await p.isVisible("text=1 cadastro aguardando aprovação"), "síndica vê alerta de pendência");
  await shot(p, "04-inicio-sindica");
  await p.goto(BASE + "/admin"); await shot(p, "05-admin");
  await p.goto(BASE + "/admin/aprovacoes");
  ok(await p.isVisible("text=Maria das Dores Silva"), "Maria na fila");
  await shot(p, "06-aprovacoes");
  await p.click("button:has-text('Aprovar')");
  await p.waitForSelector("text=foi aprovado(a)");
  ok(sql("select status from public.perfis where nome like 'Maria%'") === "aprovado", "Maria aprovada no banco");
  await p.goto(BASE + "/admin/usuarios"); await p.click("text=Maria das Dores Silva");
  await p.check("text=Prestador(a) de serviço"); await p.click("text=Salvar funções");
  await p.waitForSelector("text=Funções atualizadas");
  ok(sql("select count(*) from public.papeis_usuario pu join public.perfis p on p.id=pu.usuario_id where p.nome like 'Maria%'") === "2", "papel prestador concedido");
  await shot(p, "07-usuarios");
  await ctx.close();

  // 5) Maria entra pelo celular e acessa o app
  ctx = await novo(); p = await ctx.newPage();
  await p.goto(BASE + "/entrar");
  await p.fill("#telefone", "81999990001");
  await p.click("text=Receber código por SMS");
  if (!(await p.waitForSelector("#codigo", { timeout: 5000 }).catch(() => null))) {
    console.log("  (servidor respondeu:", (await p.locator("[role=alert]").innerText().catch(() => "?")), ")");
    await p.waitForTimeout(61000);
    await p.click("text=Receber código por SMS");
  }
  await p.fill("#codigo", "123456");
  await p.click("button:has-text('Entrar')");
  await p.waitForURL("**/inicio");
  ok(await p.isVisible("text=Bloco 07 · Apto 203"), "Maria entra e vê bloco/apto");
  ok(!(await p.isVisible("text=Administração")), "Maria não vê menu de administração");
  await shot(p, "08-inicio-morador");
  await p.goto(BASE + "/admin"); ok(p.url().endsWith("/inicio"), "morador barrado em /admin");
  await p.goto(BASE + "/perfil");
  await p.click("#pref-fonte");
  await p.waitForTimeout(600);
  await shot(p, "09-perfil-fonte-grande");
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("text=Baixar meus dados")]);
  ok((await dl.suggestedFilename()).endsWith(".json"), "exportação LGPD baixada");
  await p.click("text=Excluir minha conta");
  await p.fill("#confirma-excluir", "EXCLUIR");
  await p.click("text=Excluir definitivamente");
  await p.waitForURL("**/entrar");
  ok(sql("select count(*) from auth.users where phone='5581999990001'") === "0", "conta excluída (LGPD)");
  await ctx.close();
  await b.close();
  console.log("E2E OK");
})().catch((e) => { console.error(e); process.exit(1); });
