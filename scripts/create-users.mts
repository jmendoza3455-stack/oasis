// Crea los usuarios iniciales (admins y ops) en Supabase Auth con su rol en app_metadata.
// El trigger handle_new_user crea el perfil con ese rol. Idempotente.
// Uso: node --env-file=.env.local scripts/create-users.mts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const emails = (v: string | undefined) =>
  (v ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

const wanted = [
  ...emails(process.env.ADMIN_EMAILS).map((email) => ({ email, role: "admin" })),
  ...emails(process.env.OPS_EMAILS).map((email) => ({ email, role: "ops" })),
];
if (wanted.length === 0) {
  console.error("Define ADMIN_EMAILS y/o OPS_EMAILS");
  process.exit(1);
}

const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;

for (const { email, role } of wanted) {
  const existing = list.users.find((u) => u.email?.toLowerCase() === email);
  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, { app_metadata: { role } });
    const { error } = await supabase.from("profiles").update({ role }).eq("id", existing.id);
    if (error) throw error;
    console.log(`✓ ${email} ya existía → rol ${role}`);
    continue;
  }
  const { error } = await supabase.auth.admin.inviteUserByEmail(email);
  if (error) throw error;
  const { data: again } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const created = again.users.find((u) => u.email?.toLowerCase() === email);
  if (!created) throw new Error(`No se encontró ${email} tras invitarlo`);
  await supabase.auth.admin.updateUserById(created.id, { app_metadata: { role } });
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", created.id);
  if (profileError) throw profileError;
  console.log(`✓ ${email} invitado con rol ${role}`);
}
