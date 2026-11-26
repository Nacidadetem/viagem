# Modelo de dados

Banco: **Supabase (Postgres)**, com segurança em nível de linha (RLS) em todas as tabelas.
Cada etapa entrega a sua migração em `supabase/migrations/`.

## Etapa 1 — Núcleo (implementado)

| Tabela | Para quê | Observações |
|---|---|---|
| `blocos` | Blocos do condomínio | `mapa_x/mapa_y` posicionam o bloco no mapa (usado nos chamados) |
| `unidades` | Os 2.464 apartamentos | únicos por bloco + número; gerados por `gerar_unidades()` |
| `perfis` | 1 por login (`auth.users`) | dados mínimos; `status`: pendente → aprovado / rejeitado / suspenso |
| `papeis_usuario` | Papéis (N por pessoa) | morador, prestador, zelador, manutenção, portaria, administração, síndico |
| `consentimentos` | Histórico de aceites LGPD | termos, privacidade, notificações, ofertas de parceiros |
| `auditoria` | Ações administrativas | aprovações, rejeições, papéis, suspensões, exclusões |

**Fluxo de aprovação**: o cadastro (SMS ou e-mail) cria o perfil `pendente` por gatilho →
a administração confere bloco/apto em `fila_aprovacao()` → `aprovar_cadastro()` vincula a unidade
e concede o papel `morador`. Só perfis aprovados passam nas funções `eh_aprovado()`, `tem_papel()`,
`eh_admin()` e `eh_equipe()`, usadas pelas políticas RLS de todos os módulos.

**LGPD**: sem CPF/RG/nascimento; `exportar_meus_dados()` (portabilidade); `excluir_minha_conta()`
apaga login + perfil em cascata; conteúdos dos módulos usam `on delete set null` (ficam anônimos).

## Próximas etapas (planejado)

| Módulo | Tabelas principais |
|---|---|
| 1. Melhorias | `chamados` (categoria, status, local x/y, custo previsto/real, prazo), `chamado_fotos` (antes/depois), `chamado_apoios` (1 por pessoa), `chamado_historico` |
| 2. Comunicados | `comunicados` (segmento por blocos, importante), `comunicado_leituras`, `enquetes`, `enquete_opcoes`, `enquete_votos` (**único por unidade**), `push_inscricoes` |
| 3. Ocorrências | `ocorrencias` (tipo, anônima, protocolo sequencial por ano), `ocorrencia_respostas` |
| 4. Reservas | `areas_comuns` (antecedência, limite/mês, taxa), `reservas` (sem sobreposição via `exclude`), `eventos`, `evento_presencas` |
| 5. Vitrine | `servicos`, `servico_fotos`, `avaliacoes` (1 por pessoa/serviço), `beneficios` (descontos do bairro), selo verificado |
| 6. Mural | `anuncios` (classificado, achado/perdido, doação, carona), `denuncias` (genérica para mural/vitrine) |
| 7. Portaria | `convites` (QR de uso único, validade, token aleatório), `encomendas` (retirada confirmada) |
| 8. Assistente IA | `documentos` (regimento, convenção), `documento_trechos` com `pgvector`, `perguntas_encaminhadas` |
| 9. Pontos | `pontos_lancamentos` (livro-razão, gatilhos por ação), `resgates` |
| 10. Consumo | `leituras` (unidade, tipo água/gás, mês, valor), alerta por desvio da média do bloco |
| 11. Rede de apoio | `pedidos_apoio`, voluntários (papel/flag), aceite e conclusão |
| 12. iGreen | `ofertas_parceiro`, `interesses_parceiro` (enviado ao consultor só com consentimento) |
