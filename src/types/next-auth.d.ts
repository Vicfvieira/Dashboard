import type { Papel } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    papel: Papel;
    somenteLeitura: boolean;
  }
  interface Session {
    user: {
      id: string;
      nome: string;
      email: string;
      papel: Papel;
      somenteLeitura: boolean;
    } & Omit<DefaultSession["user"], "name" | "image">;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    nome?: string;
    papel?: Papel;
    somenteLeitura?: boolean;
    /** Início da sessão (ms). A sessão expira 8h depois, sem renovação deslizante. */
    loginEm?: number;
    /** Última reconferência do usuário no banco (ms). */
    verificadoEm?: number;
  }
}
