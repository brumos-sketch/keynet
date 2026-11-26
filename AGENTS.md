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
- Locker API (/api/public/locker/*) authenticates by Bearer API key; only its SHA-256 hash is stored on kiosks, shown once on generation. Why: a DB leak must not expose usable keys.
- Device enrollment for lockers and assisted tablets uses type-bound, admin-approved ten-minute claim codes and a device-generated 256-bit secret; derive credentials using HMAC, persist hashes only, deliver retryably until acknowledgement, and serialize approval/delivery/revocation with database locks. Why: pairing must survive lost responses without exposing keys or allowing replay after revocation.
- Assisted terminals persist their device credential in browser storage and revalidate it on reopening and every operation; retain it on network errors, discard it on confirmed revocation, and never fall back to a numeric point login. Why: closing the browser must not require pairing again or bypass administrator revocation.
- Monthly code validation and stay rotation execute in a service-only database transaction locking the point and key; keep movement logging in that transaction. Why: concurrent retries must not allocate duplicate positions or leave a returned key without its next stay.
- Run the monthly PostgreSQL procedures against isolated PGlite fixtures in tests, never production keys. Why: the same SQL can be checked end-to-end without operating a real locker.
