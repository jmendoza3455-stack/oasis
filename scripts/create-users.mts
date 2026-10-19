// Crea los usuarios iniciales (admins y ops) en Supabase Auth con su rol en app_metadata.
// El trigger handle_new_user crea el perfil con ese rol. Idempotente.
// Operaciones queda asignado a los locales de OPS_VENUES (slugs separados por coma; por defecto el
// local del despliegue). Los admin ven todos los locales. Luego se ajusta en /admin/equipo.
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

// Personal de operaciones → sus locales
const opsVenues = emails(
  process.env.OPS_VENUES ?? process.env.OASIS_VENUE_SLUG ?? "oasis-pachacamac",
);
const { data: venueRows, error: venueError } = await supabase
  .from("venues")
  .select("id, slug")
  .in("slug", opsVenues);
if (venueError) throw venueError;
const { data: finalUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
for (const { email } of wanted.filter((w) => w.role === "ops")) {
  const u = finalUsers.users.find((x) => x.email?.toLowerCase() === email);
  if (!u) continue;
  for (const v of venueRows ?? []) {
    const { error } = await supabase
      .from("venue_members")
      .upsert({ venue_id: v.id, user_id: u.id }, { onConflict: "venue_id,user_id" });
    if (error) throw error;
  }
  console.log(
    `✓ ${email} → locales: ${(venueRows ?? []).map((v) => v.slug).join(", ") || "ninguno"}`,
  );
}
