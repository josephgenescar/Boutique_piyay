# Admin Boutique Piyay

`/admin-stats.html` se sèl dashboard administratè a. Dashboard la sèvi ak koneksyon Supabase epi li verifye wòl kont lan dwe `admin` anvan li montre done yo.

## Fonksyon dashboard la

- Wè estatistik, itilizatè, vandè, pwodwi, kòmand ak notifikasyon.
- Revize aplikasyon machann ki an atant; apwouve/aktive oswa refize yo.
- Ale nan zouti Peman & Ledger la, ki verifye wòl admin ankò sou sèvè.
- Dekonekte sou dashboard admin nan.

Ansyen adrès `/admin`, `/admin/admin.html`, `/admin/login.html`, `/admin/products.html` ak `/admin/referral-codes.html` redirije sou `/admin-stats.html`.

Pou sèvi ak dashboard la, konekte avèk yon kont Supabase ki gen wòl `admin` nan tab `profiles`. Pa sèvi ak modpas admin ki estoke nan navigatè oswa yon token `localStorage` kòm pwoteksyon.

## Aplikasyon machann

Aplikasyon ki an atant parèt nan onglet **Aplikasyon Machann**. Aksyon apwobasyon an itilize fonksyon `review_vendor_application` nan `supabase-schema-vendor-applications.sql`. Si tab aplikasyon an pa disponib oswa fonksyon an pa te enstale, aplike fichye SQL sa a nan Supabase SQL Editor.

## Zouti finans

`/admin/finance.html` rete yon zouti operasyonèl apa pou peman ak ledger. Li valide kont admin nan sou sèvè; bouton **Retounen nan Dashboard Admin** mennen nan `/admin-stats.html`.
