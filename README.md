# Painelux

Painel de gestão que consolida dados do **Pelagem Studio** (pet spa) e da **Lírio** (profissionais de
beleza em São Paulo): KPIs, funil, mapa de oferta e demanda, insights, RBAC e auditoria.

> Projeto fictício desenvolvido para portfólio por Victoria Fernandes Vieira.

## Desenvolvimento

```bash
cp .env.example .env   # preencha as variáveis
npm install
npm run db:deploy      # aplica as migrations na Neon
npm run dev
```

| Script | Uso |
| --- | --- |
| `npm run build` | `prisma generate` + `prisma migrate deploy` + `next build` (Vercel) |
| `npm run build:local` | build sem aplicar migrations |
| `npm test` | testes Vitest |
| `npm run typecheck` / `npm run lint` | verificação estática |

README completo (PT/EN, arquitetura, métricas e matriz de permissões) na Etapa 12.
