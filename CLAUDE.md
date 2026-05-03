# CLAUDE.md — Projet Sunest

## Contexte client

Refonte du site **sunest.fr** pour le client **Sun Est** (installateur photovoltaïque dans le Grand Est).
Travail réalisé par **Skypeo** (l'utilisateur, monke). Le client a validé l'approche premium oryzo-style.

**Référence visuelle** : [oryzo.ai](https://oryzo.ai/) — Astro + Three.js, scroll-pinned narrative, photo qui zoom du fond, photos qui défilent horizontalement au scroll.

## État au 03/05/2026

### Pages livrées
| Page | Path | État |
|---|---|---|
| Accueil | `/` | ✅ Complet (12 sections scroll-pinnées) |
| Contact | `/contact` | ✅ Complet (Hero + form + zones + FAQ + CTA + Footer) |
| Particulier | `/services/particulier` | 🚧 En cours (Hero + Stats + Raisons + TrustClients + Étapes + Bifaces + Local) |

### Pages à faire (prochaines sessions)
- `/services/particulier` — terminer (sections suivantes encore à venir)
- `/services/professionnel`
- `/services/borne-de-recharge`
- `/services/maintenance`
- `/realisations` (nos réalisations / portfolio)
- Pages légales (Mentions légales, Politique de confidentialité)

## Stack — décidée le 2026-04-29

- **Framework** : Astro 5 (SSG pour SEO + perf)
- **Interactivité** : React 19 (Islands uniquement où nécessaire)
- **3D** : React Three Fiber 9 + Three.js 0.171 (Hero panneau procédural)
- **Animation** : GSAP 3 + ScrollTrigger
- **Smooth scroll** : Lenis 1.1 (sync avec ScrollTrigger)
- **Styling** : Tailwind CSS 4 (via plugin Vite, design tokens dans `@theme`)
- **Typo** : @fontsource-variable/manrope (self-hosted)
- **Hébergement cible** : Vercel ou Cloudflare Pages

### Workflow dev/build

```bash
cd web
npm install
npm run dev        # http://localhost:4321
npm run build      # astro check + astro build → dist/
npm run preview
```

## Identité visuelle (validée)

- **Bleu principal** `#20b8f1` (sky-brand) — kickers, accents, boutons primaires
- **Orange/jaune accent** `#ffb700` (sun) — highlight des mots-clés dans titres, CTAs primaires
- **Texte foncé** `#05142e` (ink) — fond du site (thème sombre)
- Bleus secondaires : `#0099d3` (sky-deep), `#1e73be` (sky-ocean)
- Typo : Manrope Variable (font-display avec letter-spacing -0.02em)

## Architecture du projet

```
Sunest/
├── CLAUDE.md                       # ce fichier
├── clone-study-main/               # skill source (référence)
└── web/                            # ← le projet Astro
    ├── package.json
    ├── astro.config.mjs
    ├── public/
    │   └── images/
    │       ├── SunEst_-_le_logo_definitif-2-png-300x195.webp  # logo officiel
    │       ├── hero_contact.webp                              # photo équipe + bâtiment
    │       ├── team/                  # 6 portraits équipe
    │       ├── nosServices/           # 4 photos services
    │       └── pourquoiSunEst/        # 1 photo équipe avec panneau
    └── src/
        ├── components/
        │   ├── SiteHeader.astro       # nav avec logo + 4 liens + 2 CTAs
        │   ├── three/
        │   │   └── HeroScene.tsx      # Canvas R3F panneau 192 cellules
        │   └── sections/
        │       ├── Hero.astro         # 320vh scroll-pin, pitch + stats bandeau
        │       ├── Team.astro         # 280vh scroll-pin horizontal photos →
        │       ├── Testimonials.astro # 280vh scroll-pin horizontal avis ←
        │       ├── Services.astro     # 400vh scroll-pin 4 stages crossfade
        │       ├── Pourquoi.astro     # 360vh photo qui zoom du fond
        │       ├── FAQ.astro          # 15 Q/R accordéons custom (partagée)
        │       ├── Contact.astro      # CTA grille 16x12 cellules (partagée)
        │       ├── Footer.astro       # 5 colonnes + wordmark géant (partagée)
        │       └── Zones.astro        # carte Grand-Est SVG + liste (page contact)
        ├── layouts/
        │   └── Layout.astro           # HTML root + Lenis + reveal engine global
        ├── pages/
        │   ├── index.astro            # home (7 sections + Footer)
        │   └── contact.astro          # page contact
        └── styles/
            └── global.css             # @theme tokens + grain filmique global
```

## Sections de la home

```
Hero (320vh)        — pitch + stats bandeau "+1500 / 10 ans / 0 % / 4,8/5"
Team (280vh)        — scroll-pin horizontal, photos défilent →
Testimonials (280vh)— scroll-pin horizontal sens inverse, avis défilent ←
Services (400vh)    — 4 stages crossfade (Particulier/Pro/Mobilité/SAV) avec photos
Pourquoi (360vh)    — photo zoom du fond, texte vient sur le côté
FAQ                 — 15 questions, accordéons GSAP smooth height
Contact CTA (220vh) — grille 16x12 cellules qui s'assemblent au scroll + texte
Footer              — 5 cols, wordmark "SUN EST" outline géant en arrière-plan
```

≈ 17 viewports d'expérience scroll-pinnée.

## Sections partagées (sur toutes les pages)
- **FAQ** (`FAQ.astro`)
- **Contact CTA** (`Contact.astro` — la section avec grille 16×12)
- **Footer** (`Footer.astro`)
- **SiteHeader** (en haut de chaque page)

## Sections / fichiers non utilisés (peuvent être supprimés)
Ces fichiers ont été créés au début (contenu inventé), abandonnés depuis :
- `Stats.astro`
- `Partners.astro`
- `LocalBanner.astro`
- `SloganMarquee.astro`
- `About.astro`

## Effets oryzo signature mis en place

### Effets de scroll
- **Scroll-pin Hero** : panneau 3D 192 cellules avec assembly + caméra qui dolly + tilt qui change selon `window.__heroBus.progress`
- **Scroll-pin horizontal** : Team (sens normal →) et Testimonials (sens inverse ←)
- **Crossfade par stages** : Services 4 stages, chacun avec photo qui crossfade + numéro géant outline
- **Photo qui zoom du fond** : Pourquoi (photo 520px → full bleed avec scale + flou qui s'efface)
- **Grille panneau qui s'assemble** : Contact (192 cellules en stagger top-left → bottom-right, scrubbé)
- **Carte SVG qui s'illumine** : Zones (10 paths départements + liste en stagger sync)

### Reveal engine global (dans `Layout.astro`)
- `data-split-words` : split par mot + fly-up au scroll
- `data-parallax="N"` : translation Y proportionnelle au scroll
- `data-magnetic` : CTA qui suit le curseur
- `data-tilt="N"` : card 3D au mousemove

### Decorations globales
- **Grain filmique** : `body::after` avec SVG noise mix-blend overlay 6% (dans global.css)
- **Lenis smooth scroll** : init dans Layout.astro, sync avec ScrollTrigger.update
- **Header dynamique** : SiteHeader hide-on-scroll-down / show-on-scroll-up

## Workflow validé (très important)

L'utilisateur procède **section par section** en envoyant une capture du site actuel :
1. Il envoie une capture d'écran d'une section
2. Il fournit le texte exact si nécessaire
3. Il met les images dans `public/images/<nom-section>/`
4. Je crée la section en respectant scrupuleusement les textes (pas inventer)
5. **L'ordre des captures = l'ordre des sections** sur le site
6. Je laisse les sections suivantes vides en attente de captures

## Préférences user (cf. dossier mémoire)

- **Pas de texte inventé** : toujours utiliser les textes de la capture, demander au besoin
- **Style oryzo intégral** : tout le site doit avoir des effets scroll-pinnés (pas juste le Hero)
- **Réponses courtes** : direct, en français
- **Pas de commit sans demande explicite**
- **Confirmer avant action destructive**

## Travail réalisé — sessions

### Session 2026-04-28
- Skill `clone-study` installé en global, capture sunest.fr complète
- Tokens design extraits dans `tokens.json`

### Session 2026-04-29
- Décisions stack tranchées (Astro 5 + R3F + GSAP + Lenis + Tailwind 4)
- Scaffold complet du projet dans `web/`
- 10 sections initiales avec contenu fictif (la plupart depuis abandonnées)
- Hero 3D R3F : panneau procédural 192 cellules avec assembly animation
- Bundle HeroScene : 853 KB / 230 KB gzipped (`client:visible`)

### Session 2026-05-03 (page particulier — sections Bifaces et Local)
1. **BifacesParticulier** créé (`web/src/components/sections/BifacesParticulier.astro`)
   - Layout : H2 en haut + grid 2 cols (photo gauche / texte droite, même hauteur)
   - Animation : la photo démarre **floutée + décalée vers le haut** (translateY -25 %, opacity 0.55, blur 18px) et **descend tout droit** dans sa colonne au scroll, puis défloute
   - Texte droite : H3 "15 % supérieur" + paragraphes + 2 puces + bloc encadré "véhicule électrique" + CTA, reveal cumulatif en cascade
   - Photo : `/images/plaquette-5-65c5e9d4e5b8b-768x1024.webp`
   - **Plusieurs itérations douloureuses** sur la position/taille de la photo finale (pin-grow-glide → photo bord-à-bord → photo pleine hauteur etc.) avant d'aboutir au layout grid simple avec mouvement vertical pur
2. **LocalParticulier** créé (`web/src/components/sections/LocalParticulier.astro`)
   - Même pattern que Bifaces mais **inversé** (texte gauche / photo droite)
   - Photo : `/images/pourquoiSunEst/DSC06837-1024x683.webp`
   - Textes exacts copiés-collés par le client (kicker "Acteur 100 % local", titre "Installateur photovoltaïque du Grand-Est", paragraphe villes Strasbourg/Nancy/Metz/...)
3. **Responsive** : sur mobile/tablette (< 1024 px), pas de scroll-pin, layout vertical (photo en haut / texte en bas via `order-1`/`order-2`), animation désactivée. Tout visible direct.
4. **Tailles harmonisées** avec le reste du site (H2 `text-2xl→4xl→[2.75rem]`, H3 `text-xl→2xl`, paragraphes `text-base`, CTA `px-7 py-4`)

### Session 2026-04-30 (la longue)
1. **Refonte Hero** en scroll-pin 320vh avec 3 actes texte + caméra dolly
2. **Marquee Partners** (depuis abandonné, contenu inventé)
3. **Split-text + parallax + tilt + grain** ajoutés via reveal engine global
4. **Header dynamique** hide-on-scroll-down
5. **SloganMarquee géant** (depuis abandonné)
6. Sur demande user, on a TOUT recommencé section par section avec captures :
   - Hero textes mis aux vrais textes Sun Est ("Faites de votre toit votre centrale solaire")
   - Hero stats bandeau ajouté (+1500 / 10 ans / 0 % / 4,8/5) avec counter animé
   - **Team** : refonte en scroll-pin horizontal, 6 photos qui défilent
   - **Testimonials** : scroll-pin horizontal sens inverse, 6 vrais avis Google + card Avis Google compacte
   - **Services** : scroll-pin 4 stages crossfade avec photos + numéros géants outline qui débordent
   - **Pourquoi** : refonte avec pattern "photo qui zoom du fond" (référence oryzo)
   - **FAQ** : 15 questions/réponses, accordéons GSAP smooth
   - **Contact CTA** : grille 16×12 cellules scrubbée + texte qui apparaît en sync
   - **Footer** : 5 colonnes + wordmark géant outline
   - **Logo officiel** intégré dans header + footer
   - **Page contact** créée avec hero photo équipe + formulaire complet + section "Zones d'intervention" avec carte SVG du Grand-Est
   - SiteHeader adapté multi-pages avec liens Accueil / Services / Réalisations / Contact + 2 CTAs

## TODO prochaines sessions

### À faire en priorité
- [ ] **Logo officiel** : sur fond noir le texte "SUN EST" du logo PNG est en noir → demander au client une version blanc/transparent OU contraindre dans une box claire OU inverser via filtre CSS
- [ ] **Pages services** (4 pages) : `/services/particulier`, `/services/professionnel`, `/services/borne-de-recharge`, `/services/maintenance`
- [ ] **Page réalisations** : `/realisations`
- [ ] **Pages légales** : Mentions légales, Politique de confidentialité
- [ ] **Backend formulaire contact** : actuellement `action="/api/contact"` mais pas branché (Resend / Formspree / Astro API route)
- [ ] **Adresse footer** : 136 Bd de Finlande, 54340 Pompey ou 84/A Rue Robert Schuman, 54360 Messein ? À confirmer avec le client (les 2 ont été vues sur l'ancien site)

### Améliorations possibles
- [ ] **Carte SVG Grand-Est** dans Zones : actuellement approximative (polygones simples), à remplacer par un vrai SVG officiel si le rendu cartographique est jugé trop grossier
- [ ] **Audit Lighthouse** : optimisations perf (Draco compression GLTF, code-split GSAP plugins)
- [ ] **Mentions légales / cookies** : intégrer un consent banner
- [ ] **Sitemap + robots.txt** + meta SEO par page
- [ ] **Suppression** des fichiers inutilisés (Stats/Partners/LocalBanner/SloganMarquee/About) — laisser au cas où ou nettoyer

## Fichiers clés à connaître

- `web/src/components/three/HeroScene.tsx` — Canvas R3F, panneau 6×10 cellules, animation GSAP
- `web/src/styles/global.css` — design tokens + grain global
- `web/src/layouts/Layout.astro` — Lenis + reveal engine (split-words, parallax, magnetic, tilt)
- `web/src/pages/index.astro` — home (Hero + Team + Testimonials + Services + Pourquoi + FAQ + Contact + Footer)
- `web/src/pages/contact.astro` — page contact (Hero + Form + Zones + FAQ + Contact + Footer)
- `C:\Users\monke\clone-study\sunest\` — captures originales sunest.fr + tokens

## Workflow général

- **Langue** : français
- **Pas de commit sans demande explicite**
- **Confirmer avant action destructive**
- **Suivre scrupuleusement les textes** des captures, ne rien inventer
