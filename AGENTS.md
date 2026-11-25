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
- Locker enrollment uses admin-approved ten-minute claim codes and a device-generated 256-bit secret; derive credentials using HMAC, persist hashes only, deliver retryably until acknowledgement, and serialize approval/delivery with database locks. Why: pairing must survive lost responses without exposing keys or allowing replay after revocation.
