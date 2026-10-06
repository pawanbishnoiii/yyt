<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project rules

- Roles live in `user_roles` and are checked with `has_role`/`is_mgr`/`can_hotel` SQL helpers — prevents privilege escalation and keeps RLS non-recursive.
- Guests are chain-wide; bookings/bills are hotel-scoped by RLS, and cross-hotel visit history is read only through `guest_visits()` — so other branches never see each other's history.
- Most CRUD uses the browser client under RLS; only privileged auth actions (creating staff users) go through `src/lib/admin.functions.ts` with an admin check.
- GST bill math lives in `src/lib/checkout.ts` — single source for CGST/SGST/discount/extras.
- Backups are a SQL function (`run_backup`) scheduled by pg_cron — no HTTP endpoint needed.
- App pages live under `src/routes/_authenticated/app.*`; the selected hotel comes from `useHotel()` (admins can switch).
- New sign-ups get no role until `/onboarding` calls `complete_onboarding()`, which grants manager — keeps role assignment server-side.
- Room conditions live in `room_issues` and alerts in `alerts` (written only by the cron-run `run_automations()`) — so automations need no HTTP endpoint.
- Fast check-in goes through the `quick_checkin()` RPC — it locks the room row so one room can't be double-booked.
- Demo data is created by the `seed_demo(hotel)` RPC, gated by `is_mgr` — so no seed rows are hard-coded in migrations.
- Menu photos use the private `menu-images` bucket with signed display URLs and hotel-folder RLS — public buckets are blocked by workspace policy.
- The legacy `/app/chain` route redirects to merged `/app/admin` chain control — avoids duplicate administration surfaces.
