# La Cave — Design System (v2)

> Cave à cigares personnelle. Ambiance : cave chaude, braise, cuivre, feuille de tabac.
> **v2 : moins sombre, plus de couleur, matière (liquid glass), relief 3D, mouvement au scroll.**
> Luxe chaud et vivant, jamais tape-à-l'œil. Mobile-first, PWA, thème sombre relevé.
> Réfère-toi à ce fichier avant toute UI. Les tokens vivent dans `src/app/globals.css` (`@theme`).
>
> **App sombre par conception** (texte clair partout, boutons à texte foncé sur ambre).
> Un vrai *light mode* est un chantier séparé — ne pas basculer le fond en clair sans
> reprendre le contraste de chaque page.

## Principes

1. **Charcoal chaud relevé, pas noir.** Fond `zinc-950` = L 0.20 (teinte tabac ~55°), pas du near-black. Jamais de gris froid.
2. **Deux accents.** Braise (`amber`) = CTA / actif / focus. Jade (`--color-jade-*`, feuille de tabac) = touche de couleur rare (états, dégradés glass). Une seule action ambre pleine par écran.
3. **Matière & profondeur.** Chrome flottant en *liquid glass* (`.glass` / `.glass-strong`), contenu qui défile dessous. Bord haut lumineux. Ne jamais empiler deux glass légers.
4. **Relief.** CTA en `.btn-3d` (épaisseur + halo, s'enfonce au press). Sélecteurs en `.option-3d` (relief, enfoncé quand actif).
5. **Mouvement.** Entrées `rise`/`stagger`, révélation au scroll via `data-reveal`. Easing unique `--ease-cave`. Pas de bounce par défaut (réservé aux gestes à élan). Toujours respecter `prefers-reduced-motion`.
6. **Contraste AA garanti.** Texte secondaire ≥ `zinc-600` sur fond `zinc-950`. Ne jamais descendre en dessous.
7. **Cibles tactiles 44px.** Tout contrôle a `min-height: 2.75rem` (déjà global). Boutons icône : 44px de large aussi.

## Couleurs

Échelles Tailwind `zinc`/`amber` **redéfinies** en OKLCH (pas les valeurs par défaut). Utilise les classes normales (`bg-zinc-900`, `text-amber-500`) — elles pointent vers ces tokens.

| Rôle | Token | OKLCH |
|------|-------|-------|
| Fond app | `zinc-950` | `0.20 0.012 55` |
| Surface / carte | `zinc-900` | `0.25 0.014 52` |
| Surface haute / bordure | `zinc-800` | `0.32 0.016 50` |
| Séparateur | `zinc-700` | `0.42 0.016 48` |
| Texte tertiaire (mini AA) | `zinc-600` | `0.64 0.014 52` |
| Texte secondaire | `zinc-400` | `0.78 0.012 60` |
| Texte principal | `zinc-100` | `0.95 0.006 75` |
| **Braise (CTA, actif)** | `amber-600` | `0.66 0.17 52` |
| Braise hover | `amber-500` | `0.74 0.17 60` |
| Braise claire (accents, focus) | `amber-400` | `0.80 0.15 68` |
| Accent jade (rare) | `jade-500` | `0.72 0.11 168` |

Fond du `body` : `zinc-950` + deux `radial-gradient` (halo braise haut, lueur jade bas), `background-attachment: fixed`. Ne pas remettre un fond plat.

## Typographie

- **Corps / UI** : `Geist` (`--font-sans`). Antialiasé.
- **Display / titres éditoriaux** : `Fraunces` (`--font-display`) — axes `opsz` + `SOFT`, italique dispo. Réserve-la aux titres et moments éditoriaux, pas à l'UI courante.
- **Mono** : `Geist Mono` (`--font-mono`) — chiffres, données, codes.

Poids UI : `font-medium` / `font-semibold`. Le texte sur bouton ambre est `text-zinc-950` (foncé sur clair).

## Rayons

`rounded-xl` (0.75rem) par défaut pour cartes et boutons · `rounded-lg` champs · `rounded-2xl` grandes surfaces · `rounded-full` pills, avatars, badges.

## Composants (utilitaires dans globals.css)

- **`.surface`** — carte : dégradé haut→bas, bordure ambre à 10 %, ombre portée + liseré interne. Brique de base des blocs.
- **`.glass` / `.glass-strong`** — liquid glass : `backdrop-filter: blur() saturate()`, bord haut lumineux. Pour le chrome flottant (nav, barres, sheets). `-strong` = plus opaque/flou (nav). Passe en surface opaque sous `prefers-reduced-transparency`.
- **`.btn-3d`** — CTA en relief : dégradé braise, épaisseur (`box-shadow` bas), halo coloré, s'enfonce de 4px au `:active`. Texte foncé (`text-zinc-950`).
- **`.option-3d`** — bouton de sélection en relief. Actif via `aria-pressed="true"` **ou** `data-selected="true"` → passe braise + s'enfonce.
- **`.interactive`** — hover : `translateY(-2px)` + bordure ambre + ombre. Sur cartes/tuiles cliquables.
- **`.btn-press`** — retour tactile léger (hover `brightness`, active `scale`). Pour boutons plats sans relief.
- **`.skeleton`** — shimmer tabac. **Remplace les spinners.**
- **`.rise` / `.stagger`** — entrées en cascade (40→270 ms).
- **`data-reveal`** — révélation au scroll (piloté par `ScrollReveal.tsx`, monté dans le layout). Optionnel : `style={{"--reveal-delay":"120ms"}}` pour décaler.

### CTA primaire (canonique v2)
```
btn-3d px-4 py-2.5 text-sm    (le relief, la couleur et le texte foncé viennent de .btn-3d)
```
### Bouton de sélection
```
option-3d px-4 py-2.5 text-sm    +  data-selected={value === opt} (ou aria-pressed)
```
### Carte cliquable
```
surface interactive rounded-xl p-4
```
### Section révélée au scroll
```
<section data-reveal> … </section>
```

## Mouvement

Easing unique : `--ease-cave` = `cubic-bezier(0.16, 1, 0.3, 1)`. Durées 120–160 ms (interactions), 360 ms (entrées), 620 ms (reveal scroll). Focus visible : contour `amber-400` 2px, offset 2px. **Pas de bounce/overshoot par défaut** (cf. apple-design : réservé aux gestes à élan). Tout se réduit sous `prefers-reduced-motion`.

## À ne pas faire

- ✗ Fond noir pur ou gris froid · ✗ basculer le fond en clair sans refaire le contraste des pages · ✗ empiler deux glass légers · ✗ spinners · ✗ plusieurs CTA ambre pleins par écran · ✗ jade en aplat large (accent seulement) · ✗ texte secondaire sous `zinc-600` · ✗ Fraunces sur l'UI courante · ✗ bounce par défaut · ✗ animations sans garde reduced-motion · ✗ cibles tactiles < 44px.
