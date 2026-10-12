// O Next.js resolve "server-only" internamente no build (next/dist/compiled/server-only):
// importar em código de cliente vira erro de compilação. Só o tipo é declarado aqui.
declare module "server-only";
