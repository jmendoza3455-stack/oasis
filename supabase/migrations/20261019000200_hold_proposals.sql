-- Fase 2 · Pre-reserva pedida desde el chat: el Recepcionista deja una propuesta "hold" y una
-- persona del staff (admin u operaciones) la confirma creando la pre-reserva de 72 h.
-- Crear pre-reservas ya es una acción de operaciones; el resto de propuestas sigue siendo del admin.
drop policy agent_proposals_admin_decide on public.agent_proposals;
create policy agent_proposals_decide on public.agent_proposals for update to authenticated
  using (public.is_admin() or (public.is_staff() and kind = 'hold'))
  with check (public.is_admin() or (public.is_staff() and kind = 'hold'));
