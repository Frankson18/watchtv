# WatchTV

Alternativa open-source ao [TV Time](https://www.tvtime.com) — que está encerrando suas atividades. PWA mobile-first para rastrear séries, filmes e animes: progresso de episódios, calendário de estreias, novas temporadas, estatísticas e gráfico de contribuição. Integrado com [TMDB](https://www.themoviedb.org) para catálogo e dados, e [Supabase](https://supabase.com) para autenticação e persistência.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS v4** — tema dark estilo Trakt/Netflix
- **Supabase** — Auth + Postgres com RLS
- **TMDB API v3** — catálogo, capas, episódios e calendário
- **SWR** para cache de dados
- **PWA** instalável no Android (manifest + service worker)

## Funcionalidades

| Aba | Função |
|-----|--------|
| **Assistindo** | Séries/animes em andamento ordenados pelo mais recente. Mostra `T2 • E05/10`, barra de progresso e botão `+1 ep`. |
| **Temporadas** | Séries que você acompanha com novas temporadas anunciadas/estreando. |
| **Calendário** | Mês atual com marcadores de episódios por vir. |
| **Filmes** | Listas horizontais: Para ver · Vistos · Lançamentos futuros. |
| **Buscar** | Busca no TMDB e adiciona à biblioteca. Recentes salvos localmente. |
| **Perfil** | Estatísticas (séries, filmes, episódios, tempo total), gêneros favoritos, atividade recente e gráfico de contribuição estilo GitHub. |
| **Título** | Página de detalhe com sinopse, elenco, episódios por temporada e ações (marcar visto, rewatch, remover). |

## Configuração

### 1. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
cp .env.example .env.local
```

```env
TMDB_API_KEY=sua_chave_aqui
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 2. Obter a API key do TMDB (gratuita)

1. Crie uma conta em <https://www.themoviedb.org/signup>
2. Vá em **Settings → API → Developer** e solicite uma chave
3. Copie o valor **API Key (v3 auth)** e cole em `TMDB_API_KEY` no `.env.local`

> A chave nunca é exposta no cliente: todas as chamadas ao TMDB passam por route handlers em `/api/tmdb/*`.

### 3. Mock mode (opcional — sem chave TMDB)

Se quiser testar sem configurar o TMDB, defina `NEXT_PUBLIC_TMDB_MOCK=1` no `.env.local`. O app usará dados fictícios de 8 séries e 6 filmes. Execute `npm run dev` e o seeder populará automaticamente sua biblioteca com dados demo.

### 4. Criar projeto no Supabase

1. Acesse <https://supabase.com> e clique em **New Project**
2. Vá em **Project Settings → API** e anote:
   - **Project URL** (formato `https://<id>.supabase.co`)
   - **Publishable key** (antiga "anon key". Começa com `eyJ...`)
3. Cole em `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no `.env.local`

> ⚠️ Não use a **Secret key** (antiga `service_role`) no client.

### 5. Criar as tabelas

Abra o **SQL Editor** no dashboard do Supabase, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e execute. As tabelas `library` e `watched_episodes` serão criadas com **Row Level Security**.

### 6. Rodar

```bash
npm install
npm run dev
```

Abra <http://localhost:3000> — o app redireciona para `/assistindo` (login se não autenticado).

## Estrutura

```
src/
  app/
    (app)/                  # rotas autenticadas com bottom tab nav
      assistindo/           # séries em andamento
      temporadas/           # novas temporadas
      calendario/           # calendário de episódios
      filmes/               # filmes (para ver, vistos, lançamentos)
      buscar/               # busca no TMDB
      perfil/               # estatísticas e gráfico de contribuição
      titulo/[id]/          # página de detalhe (série ou filme)
    api/
      tmdb/                 # proxy server-side da TMDB API
      health/supabase/      # health check da conexão com Supabase
    login/ signup/
    manifest.ts             # PWA manifest
  lib/
    supabase-client.ts      # client Supabase (browser)
    supabase-server.ts      # client Supabase (SSR com cookies)
    tmdb.ts                 # API do TMDB (server-only)
    tmdb-mock.ts            # dados mock para desenvolvimento
    images.ts               # helpers de URL de pôster/backdrop
    library.ts              # CRUD da biblioteca do usuário
    stats.ts                # estatísticas e dados do gráfico
    use-auth.ts             # hook de sessão
    backfill.ts             # atualiza posters mock para reais
    seed.ts                 # dados demo para desenvolvimento
    types.ts
  components/
    poster.tsx
    track-card.tsx
    episode-row.tsx
    contribution-graph.tsx
supabase/schema.sql         # migrations: tabelas + RLS
```

## Scripts

- `npm run dev` — desenvolvimento
- `npm run build && npm run start` — produção
- `npm run lint` — ESLint
- `npx tsc --noEmit` — typecheck

## Health check

Acesse `/api/health/supabase` para verificar se a conexão com Supabase, as tabelas e as políticas RLS estão funcionando corretamente.
