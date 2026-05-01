# clone-study

A [Claude Code skill](https://docs.claude.com/en/docs/claude-code/skills) that
studies and recreates high-end websites (Awwwards Site of the Day, premium SaaS,
creative agency work) from a URL — and produces a faithful study recreation
using your own assets.

Point it at a site. It captures the page systematically, extracts design tokens
and animation behaviour, writes a recreation brief, then orchestrates your
existing `scaffold` / `design` / `polish` / `verify` skills to rebuild the
structure with substituted assets and original copy.

> **Not a byte-for-byte clone.** The output is a *study* — same layout, same
> design system, same scroll choreography — but built from scratch with your
> own typography, photography, copy, and 3D. That distinction matters ethically
> (original assets and bundled JS stay with their authors), legally, and
> practically (minified production code is barely readable; the only way to
> actually understand a premium site is to rebuild it from observation).

---

## What it does

```
URL → capture → analyze → brief → scaffold → design → verify → diff → iterate → teardown.md
```

For a given target it produces a workspace at `~/clone-study/<site-slug>/`
containing:

- **`raw-capture/`** — Playwright multi-viewport screenshots, scroll-state
  frames, 30 s video recording, DOM snapshot, network log, computed styles,
  detected framework + library globals.
- **`analysis.json`** — Stack fingerprint (Next/Nuxt/Astro/…), animation
  library, 3D lib, styling approach. Confidence-tagged.
- **`tokens.json`** — Extracted colour palette, typography scale, spacing,
  border-radius, box-shadow, easing curves. Tailwind-config shaped so you can
  drop it straight into the build.
- **`recreation-brief.md`** — The bridge doc: stack decision, narrative model,
  section list, animation spec table, asset-substitution table, copy-tone
  direction, difficulty flags.
- **`build/`** — The scaffolded recreation.
- **`diff-iterations/`** — Side-by-side comparison screenshots after each
  polish pass.
- **`teardown.md`** — Raw material for your video script / blog post: what
  techniques were learned, what was hard to recreate, what was swapped.

---

## What makes it different

- **Narrative-model detection.** Before scaffolding anything it decides whether
  the target is a vertical-page build or a scroll-pinned timeline — the single
  most consequential architecture choice and the one that most teardowns get
  wrong. Every Awwwards-tier 3D site is a pinned timeline; most "good" SaaS
  sites are vertical-page. Picking the wrong one burns a day.
- **Premium-look defaults that don't look "rough."** Ships with a reference
  doc of the exact bloom / SMAA / material settings that make R3F scenes feel
  cinematic instead of crunchy — recovered from the half-day of debugging
  the first build of this skill cost.
- **Asset-substitution playbook.** For every common bespoke asset type
  (foundry fonts, brand photography, splat scans, bespoke 3D) there's a ranked
  list of free substitutes. Notably: **SVG → ExtrudeGeometry** as the go-to
  swap when the target uses splats you don't have.
- **Debugging traps pre-solved.** Vite 7 + Node 20.18 rolldown trap, the
  camera-dolly-that-doesn't-visibly-displace bug, the `transition: opacity`
  ghost-overlap, and five more — all documented with fixes in
  [`references/scroll-pinned-timeline.md`](references/scroll-pinned-timeline.md).

---

## Installation

Clone into your Claude Code skills directory:

```bash
cd ~/.claude/skills
git clone https://github.com/luukalleman/clone-study.git
```

Install the Python deps used by the capture + diff scripts:

```bash
pip install playwright pillow numpy
playwright install chromium
```

That's it. Claude Code picks the skill up automatically on next launch. Invoke
it by any of the trigger phrases — "clone this site", "study how this is
built", "rebuild this design", "I want my site to look like X".

---

## Usage

```
You:    Study https://linear.app and rebuild it as close as you can.
Claude: [invokes clone-study → capture → analyze → ...]
```

Or pass a URL explicitly:

```
You:    Run clone-study on https://www.vercel.com/ai
```

The skill will report progress as it runs through the phases. You can drop in
at the **recreation brief** step to steer the stack/tone/substitutions before
the build phase starts.

---

## Layout

```
clone-study/
├── SKILL.md                           ← the orchestration
├── scripts/
│   ├── capture.py                     ← Playwright multi-viewport capture
│   ├── extract_tokens.py              ← palette / type / spacing / easings
│   └── visual_diff.py                 ← per-viewport heatmap + scores
├── references/
│   ├── framework-fingerprints.md      ← how to identify the target's stack
│   ├── animation-detection.md         ← taxonomy + timing-estimation
│   ├── asset-substitution.md          ← bespoke-asset → free-equivalent table
│   ├── scroll-pinned-timeline.md      ← architecture + premium defaults + traps
│   └── recreation-brief-template.md   ← the bridge-document template
└── evals/
    └── evals.json                     ← 3 test prompts for iterative dev
```

---

## Philosophy

Every teardown of a premium website falls into one of two traps: (1)
downloading the bundle and reshipping it, which is copying, or (2) eyeballing
screenshots and hallucinating the implementation. The first is unethical.
The second produces garbage.

This skill proposes a third path: **capture systematically → extract what's
actually there → rebuild from observation with your own assets**. The result
is something you understand deeply enough to extend, remix, and ship. It's
how creative studios have always learned from each other.

---

## Contributing

Issues + PRs welcome — especially:

- Additional **framework fingerprints** for new meta-frameworks
- **Asset substitutes** (fonts, splats, 3D models) I haven't catalogued
- **Debugging traps** you've hit building similar sites
- New **reference docs** for patterns the skill doesn't cover yet (horizontal
  scroll, bento-grid-with-3D, WebXR, …)

---

## License

MIT — see [LICENSE](LICENSE). Do what you want with it.

---

**Built by [@luukalleman](https://github.com/luukalleman).** If you build
something with it, send me the link.
