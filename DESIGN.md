# La Cave — Design System (v3 · Liquid Glass)

> Cave à cigares personnelle. Ambiance : humidor sombre, **cognac**, crème fumée, cuir.
> **v3 : verre translucide (liquid glass) + réfraction au toucher, palette cognac/bordeaux, icônes fines.**
> Luxe chaud et vivant, jamais tape-à-l'œil. Mobile-first, PWA, thème sombre.
> Réfère-toi à ce fichier avant toute UI. Les tokens vivent dans `src/app/globals.css` (`@theme`).
>
> **App sombre par conception** (texte crème partout, boutons à texte foncé sur cognac).
> Light mode = chantier séparé (ne pas basculer le fond sans reprendre le contraste des pages).

## Principes

1. **Quasi-noir chaud, pas noir clinique.** Fond `zinc-950` = `#0E0B08` (L 0.148, teinte 60). Halos cognac (haut) + bordeaux (bas) sur le body. Jamais de gris froid ni de fond plat.
2. **Accent unique cognac.** `amber-*` ancré sur `#C88A3D` (cognac, peu saturé — luxe, pas candy) = CTA / actif / focus. **Bordeaux** (`wine-*`, échelle `orange` remappée) = alertes/destructif. Jade assourdi, résiduel. Une seule action `btn-3d` pleine par écran.
3. **Matière liquid glass.** `.surface` (cartes), `.glass` / `.glass-strong` (chrome flottant) : teinte crème translucide + blur 20–22px + **bordure 1px en dégradé lumineux** (double background padding-box/border-box) + spéculaire inset. Le contenu défile dessous. Ne jamais empiler deux glass légers.
4. **Réfraction au toucher.** Attribut `data-liquid` sur une carte → elle s'incline vers le doigt + spéculaire qui suit le contact (géré par `LiquidTouch.tsx`, monté globalement). GPU only.
5. **Relief.** CTA en `.btn-3d` (cognac, s'enfonce au press). Sélecteurs en `.option-3d`.
6. **Mouvement.** `rise`/`stagger`, `data-reveal` au scroll, `page-enter` par navigation. Easing `--ease-cave` ; spring `--ease-liquid` réservé aux gestes. Toujours `prefers-reduced-motion`.
7. **Contraste AA + 44px.** Texte secondaire ≥ `zinc-600` ; tout contrôle `min-height: 2.75rem`.

## Couleurs

Échelles Tailwind `zinc`/`amber` **redéfinies** en OKLCH (pas les valeurs par défaut). Utilise les classes normales (`bg-zinc-900`, `text-amber-500`) — elles pointent vers ces tokens.

| Rôle | Token | OKLCH |
|------|-------|-------|
| Fond app (`#0E0B08`) | `zinc-950` | `0.148 0.008 60` |
| Surface / carte | `zinc-900` | `0.19 0.011 58` |
| Surface haute / bordure | `zinc-800` | `0.25 0.013 55` |
| Séparateur | `zinc-700` | `0.34 0.015 52` |
| Texte tertiaire (mini AA) | `zinc-600` | `0.60 0.02 62` |
| Texte secondaire | `zinc-400` | `0.76 0.024 70` |
| Texte principal (crème `#EDE3D4`) | `zinc-100` | `0.925 0.021 80` |
| **Cognac (CTA, actif) `#C88A3D`** | `amber-500` | `0.68 0.105 72` |
| Cognac clair (accents/focus) | `amber-400` | `0.75 0.1 75` |
| **Bordeaux (alertes/destructif)** | `wine-500` | `0.55 0.12 16` |
| Jade assourdi (résiduel) | `jade-500` | `0.68 0.07 168` |

L'échelle `orange` est remappée sur le bordeaux : les états d'alerte existants basculent sans édition (préférer `wine-*` pour le nouveau markup). Fond du `body` : `zinc-950` + halos `radial-gradient` cognac (haut) / bordeaux (bas), `background-attachment: fixed`. Jamais de fond plat.

## Typographie

- **Corps / UI** : `Geist` (`--font-sans`). Antialiasé.
- **Display / titres éditoriaux** : `Fraunces` (`--font-display`) — axes `opsz` + `SOFT`, italique dispo. Réserve-la aux titres et moments éditoriaux, pas à l'UI courante.
- **Mono** : `Geist Mono` (`--font-mono`) — chiffres, données, codes.

Poids UI : `font-medium` / `font-semibold`. Le texte sur bouton ambre est `text-zinc-950` (foncé sur clair).

## Rayons

`rounded-xl` (0.75rem) par défaut pour cartes et boutons · `rounded-lg` champs · `rounded-2xl` grandes surfaces · `rounded-full` pills, avatars, badges.

## Composants (utilitaires dans globals.css)

- **`.surface`** — carte liquid glass (v3) : teinte crème translucide + blur 20px + **bordure 1px en dégradé lumineux** (crème 32→5→13 %, via double background padding-box/border-box) + spéculaire inset. Brique de base des blocs/cartes.
- **`.glass` / `.glass-strong`** — chrome flottant (nav, sheets). `-strong` = verre clair réfractif + balayage spéculaire animé + arête lumineuse. Passe en surface opaque sous `prefers-reduced-transparency`.
- **`data-liquid`** — réfraction au toucher (v3) : la carte s'incline vers le doigt + spéculaire qui suit le contact, retour spring `--ease-liquid`. Piloté par `LiquidTouch.tsx` (monté dans le layout, délégué global) — poser l'attribut suffit, rien à importer.
- **`.glass-refract`** — couche `backdrop-filter: url(#liquid-glass)` (déforme le contenu derrière ; Chrome/Android, inerte iOS Safari). Filtre SVG dans `layout.tsx` (feDisplacementMap `scale=35`, turbulence animée).
- **`.btn-3d`** — CTA en relief **cognac** (v3) : dégradé cognac, épaisseur `box-shadow`, s'enfonce de 3px au `:active`. Texte foncé. **Une seule action pleine par écran.**
- **`.tab-icon` / `.tab-icon-active`** — icônes fines de nav (opacity 0.5 → 1 + drop-shadow cognac quand actif). Emoji nav remplacés par icônes 1.5px.
- **`.pulse-star`** — pulsation douce (2.4s) pour l'étoile ⭐ « envies ».
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
