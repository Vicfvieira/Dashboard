import "server-only";

/**
 * Acesso de demonstração para quem chega pelo portfólio: conta GESTOR somente leitura, com senha
 * pública por definição (mostrada na tela de login). A senha vem de SEED_DEMO_PASSWORD, a mesma
 * que o seed usa para criar a conta.
 */
export const EMAIL_DEMO = "demo@painelux.dev";

export function credenciaisDemo(): { email: string; senha: string } | null {
  const senha = process.env.SEED_DEMO_PASSWORD;
  return senha && senha.length >= 12 ? { email: EMAIL_DEMO, senha } : null;
}
