import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

/**
 * Cliente con service role: SIN RLS. Solo para procesos de servidor (formularios públicos con
 * rate limiting, crons, agentes). Para marcar a un agente en audit_log usar la RPC con
 * oasis.actor_type = 'agent'. Nunca importar desde código de cliente.
 */
export function createAdminClient() {
  const env = serverEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
