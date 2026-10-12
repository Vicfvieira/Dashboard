@AGENTS.md

# Notas técnicas do repositório (mantidas pelo agente)

- Prisma fixado na v6 (`prisma-client-js`, `url` + `directUrl` no schema): a v7 exige driver adapter
  (`@prisma/adapter-*`), biblioteca fora da stack aprovada.
- shadcn/ui inicializado manualmente (`components.json`, `src/lib/utils.ts`, tokens em `globals.css`)
  porque a rede do ambiente de desenvolvimento bloqueia `ui.shadcn.com`. Componentes são escritos em
  `src/components/ui` seguindo o padrão new-york.
- `npm run build` = `prisma generate && prisma migrate deploy && next build` (usado pela Vercel).
  Localmente sem banco, use `npm run build:local`.
- Infraestrutura (Etapa 1):
  - Neon: projeto `painelux` (id `mute-cell-98742187`, aws-sa-east-1, PG 17, banco `neondb`).
  - Vercel: projeto `painelux` (id `prj_RTMzuL72g6dwbF7uARcU54wloJxO`), ligado a `Vicfvieira/Dashboard`
    na branch main, funções em gru1. Produção: https://painelux.vercel.app
  - APIs: Pelagem em https://pelagem-studio.vercel.app e Lírio em https://lirio-estetica.vercel.app
    (`/api/integracao/*`, header `x-api-key`, 401 sem chave). Formatos observados: Pelagem
    `/agendamentos` → `{ dados: [...] }` com `clienteHash`, `servico`, `porte`, `status`, `inicio`,
    valores em centavos; Lírio `/profissionais` → `{ itens: [{ distrito, nomeDistrito, subprefeitura,
    regiao, categoria, total, verificadas }] }`, `/eventos` → `{ periodo, totais, itens: [{ dia,
    distrito, categoria, buscas, visualizacoes, cliquesWhatsapp, cliquesInstagram }] }`.
  - A rede do ambiente de desenvolvimento bloqueia `*.vercel.app`, APIs da Vercel/Neon e a porta 5432:
    use os conectores (MCP) da Neon e da Vercel; testes HTTP externos via Vercel Sandbox.
- Next.js 16 com `cacheComponents`: leia `node_modules/next/dist/docs/` antes de usar APIs novas.

---

# Prompt do projeto (salvo integralmente na Etapa 0)

# CONTEXTO
Sou Victoria Fernandes Vieira, desenvolvedora Full Stack. Este é um projeto FICTÍCIO para meu portfólio:
"Painelux", painel de gestão SaaS que consolida dados de dois produtos meus, já publicados na Vercel:
1. Pelagem Studio: pet spa com agendamentos. API /api/integracao/agendamentos e /resumo.
2. Lírio: plataforma que conecta clientes a profissionais de beleza em todos os 96 distritos de São
   Paulo. API /api/integracao/profissionais (contagem por distrito e categoria), /eventos (buscas,
   visualizações de perfil e cliques no WhatsApp por distrito, categoria e dia) e /resumo.
As duas APIs usam o header x-api-key, e nenhuma envia dados pessoais.
O Painelux deve provar a recrutadores três competências: análise de dados (KPIs, funil, mapa de
oferta e demanda, insights), segurança (RBAC, auditoria, proteção de login) e integração entre
sistemas. Também deve parecer um produto real de empresa: muito interativo, rico em informação,
nada básico nem com cara de gerado por IA.
Tenho NEON_API_KEY e VERCEL_TOKEN disponíveis como variáveis de ambiente (ou nesta conversa).

Stack: Next.js (App Router, TypeScript), Tailwind CSS + shadcn/ui, Recharts, @tanstack/react-table,
next-themes, motion, leaflet + react-leaflet com tiles OpenStreetMap, Server Actions e Route
Handlers, PostgreSQL na Neon + Prisma, Auth.js (next-auth v5) com credenciais, Zod, bcryptjs,
date-fns, lucide-react, Vitest, @faker-js/faker, tsx. CLIs: neonctl e vercel (via npx).

Identidade visual: tema escuro padrão e opção clara. Primária roxo #7C3AED, fundo #0F0F14, cards
#1A1A23, texto #EDEDF2; tema claro com fundo #F7F7FB. Pelagem em #E8833A e Lírio em #D8B4A6.
Fonte Inter. Interface densa, com microinterações suaves.

Regras:
- Papéis: ADMIN (tudo, usuários, logs, sincronização, infraestrutura), GESTOR (dashboards e
  exportação), ATENDENTE (só a agenda do dia do Pelagem, sem valores financeiros).
- Usuário demo para recrutadores: GESTOR somente leitura.
- Login: bcrypt, bloqueio de 15 min após 5 falhas, sessão de 8h, toda tentativa no AuditLog com IP e
  user-agent. Usuários, sincronização e exportação também vão ao AuditLog.
- Métricas do Pelagem: ticket médio = faturamento / atendimentos concluídos; taxa de retorno =
  clientes com 2+ atendimentos no período / clientes atendidos; inativo = mais de 30 dias sem voltar.
- Métricas da Lírio: taxa de visualização = visualizações / buscas; taxa de contato = cliques no
  WhatsApp / visualizações; índice de demanda por distrito e categoria = buscas / profissionais
  ativas (acima de 1,5 é demanda reprimida; abaixo de 0,5 é excesso de oferta).

# PAPEL
Atue como engenheiro(a) Full Stack sênior com experiência em analytics, segurança de aplicações e
DevOps, e com olhar de designer de produto.

# TAREFA
Execute as etapas abaixo UMA POR VEZ, na ordem. Ao terminar cada etapa, pare, entregue o Formato de
Saída e espere eu responder "próxima". Salve este prompt inteiro em CLAUDE.md na Etapa 0.

Etapa 0 — Setup do código: instale as dependências da stack, rode prisma init e shadcn init, crie
.env.example com DATABASE_URL, DIRECT_URL, AUTH_SECRET, PELAGEM_API_URL, PELAGEM_API_KEY,
LIRIO_API_URL, LIRIO_API_KEY, CRON_SECRET e as senhas dos usuários do seed. Configure o Prisma para
Neon (pooling em DATABASE_URL e conexão direta em DIRECT_URL) e o build com prisma generate +
prisma migrate deploy + next build. Adicione vercel.json com regions ["gru1"] e cron diário em
/api/cron/sync. Faça commit e push.

Etapa 1 — Infraestrutura na Neon e na Vercel (faça você mesmo, com NEON_API_KEY e VERCEL_TOKEN):
1. Teste o acesso às duas APIs. Se a rede bloquear, pare e me passe o passo a passo manual exato.
2. Neon: crie o projeto "painelux" na região aws-sa-east-1 (São Paulo) com neonctl, se não existir,
   e obtenha as connection strings com e sem pooling.
3. Vercel: crie ou vincule o projeto "painelux" ao repositório do GitHub, na branch main.
4. Leia as variáveis dos projetos já existentes do Pelagem e da Lírio na Vercel para descobrir as
   URLs de produção e as INTEGRATION_API_KEY. Se alguma estiver marcada como sensível e não puder
   ser lida, gere uma chave nova, atualize INTEGRATION_API_KEY no projeto do site e faça o redeploy
   dele.
5. Gere AUTH_SECRET, CRON_SECRET e as senhas do seed. Cadastre todas as variáveis no projeto painelux
   para Production e Preview, com vercel env add.
6. Crie o .env local com os mesmos valores (ignorado pelo Git), rode prisma migrate deploy e o seed
   na Neon, e faça o deploy de produção.
7. Confira: build concluído, tabelas na Neon, página de login abrindo e as duas APIs respondendo
   200 com a chave.
8. Me entregue: URL de produção, lista das variáveis cadastradas (só os nomes) e as credenciais dos
   usuários do seed, uma única vez.

Etapa 2 — Banco e seed: User (ADMIN/GESTOR/ATENDENTE, ativo, tentativasFalhas, bloqueadoAte),
AuditLog, SyncRun, AppointmentFact (Pelagem; único por idOrigem), ProfessionalStat (Lírio:
distrito, região, categoria, ativas, data) e MarketEventFact (Lírio: dia, distrito, região,
categoria, buscas, visualizações, cliques). Tabela de referência com os 96 distritos (slug,
subprefeitura, região) e GeoJSON simplificado dos distritos em src/data. Seed idempotente com 4
usuários (admin, gestor, atendente, demo) e 6 meses de dados fictícios coerentes, para o painel
funcionar antes da sincronização. Rode migrate e seed na Neon.

Etapa 3 — Autenticação, RBAC e auditoria: Auth.js com bloqueio por tentativas e log de login;
src/lib/rbac.ts com matriz de permissões e helpers can() e requirePermission() usados em páginas,
rotas e Server Actions; usuário demo sem nenhuma escrita. Testes Vitest da matriz e do bloqueio.

Etapa 4 — Layout e navegação: sidebar recolhível filtrada pelo papel (Visão geral, Pelagem, Lírio,
Mapa de mercado, Clientes, Agenda do dia, Insights, Usuários, Logs, Configurações); topbar com filtros
de período (7d, 30d, 90d, 12m, personalizado), comparação com período anterior e produto, tudo
salvo na URL; paleta de comandos com Ctrl+K para navegar e trocar filtros; seletor de tema;
skeletons, estados vazios úteis e transições suaves entre páginas com motion.

Etapa 5 — Sincronização: clientes das duas APIs em src/lib/sync/ (x-api-key, paginação, 3
tentativas com espera crescente, validação Zod), upsert idempotente, registro em SyncRun, botão
Sincronizar agora (ADMIN) com histórico e status por fonte em /configuracoes, rota /api/cron/sync
protegida por Authorization: Bearer CRON_SECRET. Testes com fetch simulado. Rode uma sincronização
real em produção ao final.

Etapa 6 — Visão geral consolidada: métricas puras em src/lib/metrics.ts com testes; KPIs com
CountUp e variação contra o período anterior (faturamento e atendimentos do Pelagem; buscas,
cliques no WhatsApp e profissionais ativas da Lírio); gráfico de tendência das duas marcas; card
"Destaques da semana" com os 3 maiores movimentos do período; cada gráfico com botão Ver como tabela
e exportação em PNG e CSV.

Etapa 7 — Página Pelagem: faturamento semanal, top 10 serviços, mapa de calor dia × hora, mix por
porte e espécie, taxa de cancelamento e clientes inativos em tabela TanStack (busca, ordenação e
exportação de clienteHash com log).

Etapa 8 — Página Lírio: funil buscas → visualizações → cliques no WhatsApp, com queda entre etapas,
por categoria e região; categorias em alta (crescimento contra o período anterior); horários e dias
de pico de busca; evolução de profissionais ativas; ranking de distritos por conversão.

Etapa 9 — Mapa de mercado: mapa Leaflet com os 96 distritos coloridos pelo índice de demanda, com
seletor de categoria e de métrica (buscas, oferta, índice, conversão); clicar num distrito abre um
painel lateral com evolução mensal, categorias mais buscadas e comparação com a média da região;
legenda clara e tabela alternativa acessível.

Etapa 10 — Insights automáticos (regras, sem IA): página Insights que gera frases a partir dos
dados, como "Vila Sônia teve 2,1x mais buscas por Lash designer do que profissionais disponíveis" ou
"cancelamentos de sábado subiram 18% no Pelagem", com prioridade, link para o gráfico de origem e
testes Vitest das regras.

Etapa 11 — Agenda do dia e administração: Agenda do dia do Pelagem para ATENDENTE (sem nenhum valor
financeiro enviado ao navegador); Usuários (criar, editar papel, desativar, redefinir senha, nunca
remover o último ADMIN) e Logs filtráveis com exportação CSV, ambos só para ADMIN.

Etapa 12 — Polimento e entrega: tour guiado curto para o usuário demo na primeira visita; aviso de
demonstração com as credenciais demo na tela de login; headers de segurança (CSP, X-Frame-Options,
Referrer-Policy); páginas 404 e erro; Lighthouse e acessibilidade revisados. README em português e
inglês com prints, diagrama Mermaid da arquitetura (Pelagem e Lírio → APIs com chave → sincronização
→ Neon → dashboards), matriz de permissões, definição de cada métrica, regras dos insights e acesso
demo. Deploy final de produção e verificação completa.

# RESTRIÇÕES
- TypeScript estrito, sem any. Zod em tudo o que vem de formulários e APIs externas.
- Autorização verificada no servidor em toda rota, Server Action e consulta.
- SQL cru somente parametrizado ($queryRaw com template), nunca concatenado.
- Segredos e tokens: nunca escreva em arquivos versionados, nunca mostre na resposta (mostre só os
  nomes das variáveis), nunca registre em logs. O .env fica no .gitignore.
- Infraestrutura: só crie ou altere recursos dos projetos painelux, pelagem e lírio. Nunca apague
  projetos, bancos, branches ou variáveis existentes sem me perguntar antes. Respeite os limites do
  plano gratuito e me avise se algo exigir plano pago.
- Bibliotecas: somente as da stack. Qualquer outra, peça antes.
- Somente dados fictícios. O Painelux nunca armazena dados pessoais.
- Contraste AA nos dois temas; cada gráfico com título, descrição e tabela alternativa; animações
  respeitando prefers-reduced-motion.
- Textos de interface específicos e profissionais, sem jargão genérico nem emojis como ícones.
- Rodapé: "Projeto fictício desenvolvido para portfólio por Victoria Fernandes Vieira."
- Faça commit e push ao final de cada etapa, na branch main.

# FORMATO DE SAÍDA (ao fim de cada etapa, em português)
1. O que foi feito, em até 5 linhas.
2. Arquivos criados ou alterados e recursos criados na Neon ou na Vercel.
3. Comandos que eu preciso rodar, se houver e o que for possível você fazer e alterar, faça. 
4. Onde ver cada mudança e passo a passo para testar.
5. Mensagem do commit feito.
