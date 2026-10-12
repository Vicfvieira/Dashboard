import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Autenticação antes de renderizar: sem sessão válida, toda rota protegida vai para /login
 * (guardando o destino). A autorização por papel é verificada no servidor de cada página,
 * Route Handler e Server Action via requirePermission().
 */
export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const publico = pathname === "/login";

  if (!req.auth && !publico) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }
    const destino = new URL("/login", req.nextUrl);
    if (pathname !== "/") destino.searchParams.set("destino", `${pathname}${search}`);
    return NextResponse.redirect(destino);
  }
  if (req.auth && publico) return NextResponse.redirect(new URL("/", req.nextUrl));
  return NextResponse.next();
});

export const config = {
  // Fora do proxy: rotas do Auth.js, cron (protegido por CRON_SECRET), assets e arquivos estáticos.
  matcher: ["/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|json|txt)$).*)"],
};
