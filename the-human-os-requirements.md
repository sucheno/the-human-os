# The Human OS — Requirements Document
### "Your Body's Operating System" — A Minimalistic, Medium-Style Learning Site

This document is written for an AI coding agent (Claude Code, GitHub Copilot, etc.) to build this project with minimal ambiguity. Follow it as the source of truth. Where a decision isn't specified, prefer the simplest, most standard solution over a clever one.

---

## 1. Project Summary

A static, content-first website that teaches a curious adult reader how the human body works — organs, hormones, nutrition, sleep, and lifestyle — in a structured, sequential course made of short markdown articles. The experience should feel like reading a well-organized Medium publication: clean typography, no clutter, one column, nothing fighting for attention except the text.

**Non-goals:** no user accounts, no backend, no database, no comments, no CMS admin panel. Content is authored as markdown files committed to the repo.

---

## 2. Tech Stack & Architecture

- **No framework required.** Plain HTML + CSS + vanilla JS.
- **No build step required** for v1. Markdown files are fetched client-side (`fetch()`) and rendered using **marked.js** (via CDN, pinned version, e.g. `marked@11.x`) or **markdown-it**. Pick one and use it consistently.
- **No backend, no database.** Fully static — must be deployable as-is to GitHub Pages, Netlify, Vercel, or Cloudflare Pages by pointing at the repo root.
- **Persistence:** browser `localStorage` only (for bookmarking, read-state, dark mode preference). No cookies, no external analytics unless explicitly requested later.
- **Dependencies allowed via CDN:** a markdown parser (marked.js or markdown-it), nothing else unless required for a specifically requested feature (e.g., a tiny fuzzy-search lib for the search feature — `Fuse.js` is a good lightweight choice, optional).
- **Browser support:** modern evergreen browsers only (Chrome, Firefox, Safari, Edge, last 2 versions). No IE11 concerns.
- **Responsive:** must work well on mobile, tablet, and desktop. Reading column should reflow, not just shrink.

### Suggested file structure

```
/index.html                  ← Table of Contents (home page)
/article.html                ← Single article template, content injected via JS
/style.css
/app.js                      ← core logic: routing, rendering, bookmarking, TOC
/manifest.json                ← ordered list of all sections + articles + metadata
/content/
  /01-systems-overview/
    00-intro.md
    01-cardiovascular.md
    02-respiratory.md
    03-digestive.md
    04-nervous.md
    05-endocrine-overview.md
    06-immune.md
    07-musculoskeletal.md
  /02-hormones/
    00-intro.md
    01-insulin-glucagon.md
    02-cortisol.md
    03-thyroid.md
    04-sex-hormones.md
    05-hunger-hormones-leptin-ghrelin.md
    06-melatonin.md
    07-feedback-loops.md
  /03-nutrition/
    00-intro.md
    01-macronutrients.md
    02-vitamins-fat-soluble.md
    03-vitamins-water-soluble.md
    04-minerals.md
    05-digestion-process.md
    06-gut-microbiome.md
  /04-sleep/
    00-intro.md
    01-sleep-architecture.md
    02-circadian-rhythm.md
    03-sleep-and-hormones.md
    04-sleep-and-immunity.md
  /05-lifestyle-integration/
    00-intro.md
    01-exercise-physiology.md
    02-stress-and-cortisol-longterm.md
    03-how-it-all-connects.md
    04-building-daily-habits.md
/assets/
  /icons/ (svg icons: bookmark, checkmark, moon/sun for dark mode, search)
```

Routing can be simple query-param based: `article.html?section=02-hormones&slug=02-cortisol` — no need for a router library or clean URLs in v1 (can add later via `history.pushState` if desired, but not required).

---

## 3. Content Requirements (Very Important)

### 3.1 Course structure & duration
- **5 sections**, matching the folder structure above.
- **~35-38 articles total**, each **600-1,000 words** (roughly a 4-6 minute read). This keeps total course time to approximately **8-10 hours** spread over **~4-5 weeks** at a relaxed pace of 2-3 articles a day — long enough to be substantive, short enough to actually finish. Do not pad articles to hit a word count.
- Each section starts with a short `00-intro.md` (200-300 words) framing why the section matters and how it connects to the rest of the course.
- Order matters and is fixed by the manifest — this is a **linear course**, not a wiki, though readers can jump around freely via the TOC.

### 3.2 Accuracy requirements (non-negotiable)
- **Every factual claim must be accurate and sourced.** No invented statistics, no approximate numbers presented as precise, no outdated claims (e.g., debunked "10,000 steps" origin myths, debunked "you only use 10% of your brain," etc.).
- **Prefer primary/authoritative sources only:**
  - NIH / NIH Office of Dietary Supplements (ODS) fact sheets
  - MedlinePlus (NLM)
  - Mayo Clinic
  - Cleveland Clinic
  - CDC
  - Peer-reviewed review articles (PubMed/PMC) when a claim needs a citation beyond a general health site
  - Physiology textbooks in the public domain (OpenStax *Anatomy & Physiology*) for foundational mechanism explanations
- **Do not cite:** wellness blogs, influencer content, supplement-company sites, or any source with a commercial incentive to exaggerate.
- If a topic is scientifically contested or evolving (e.g., exact optimal vitamin D dosage, some microbiome claims), **say so explicitly in the text** rather than presenting one view as settled fact. A short "what's still debated" callout box is encouraged where relevant.
- Avoid absolute medical claims or personalized advice ("you should take X mg of Y"). Keep it educational/explanatory, not prescriptive. Include a brief, non-alarmist general disclaimer once, sitewide (e.g., in the footer or an "About" page) noting this is educational content, not medical advice.

### 3.3 Sources on every page (required feature)
- Every article `.md` file **must end with a `## Sources` section** listing every source used, as a plain list:
  ```
  ## Sources
  - [National Institute on Aging – How the Heart Works](https://...)
  - [NIH ODS – Vitamin D Fact Sheet](https://...)
  ```
- The renderer should style this section visually distinct from the body (smaller text, muted color, top border) so it reads like a footnote/reference block, not body content.
- Minimum **2 sources per article**; aim for 3-5 where the topic warrants it.

### 3.4 Writing style / tone
- Clear, plain-language explanations — assume an intelligent adult with no medical background.
- Favor analogies where they aid understanding (the OS/systems metaphor fits this site well — e.g., "cortisol is like a system-wide priority interrupt") but don't force it into every paragraph.
- Short paragraphs (2-4 sentences). Subheadings every ~150-250 words. Bullet lists for enumerable facts (e.g., list of B vitamins).
- No em-dash-heavy listicle tone. Write like a well-edited long-form article, not a slide deck.

### 3.5 Markdown front matter (required per article)

Each `.md` file should start with YAML front matter so the manifest/JS can render metadata without parsing the whole file:

```yaml
---
title: "Cortisol and the Stress Response"
section: "02-hormones"
slug: "02-cortisol"
order: 2
readingTimeMinutes: 6
summary: "How your body's main stress hormone works, and why chronic elevation matters."
---
```

`readingTimeMinutes` can also be auto-calculated client-side (word count ÷ 200) instead of hardcoded — pick one approach and be consistent; auto-calculation is preferred since it can't go stale.

---

## 4. Functional Requirements

### 4.1 Home page (`index.html`) — Table of Contents
- Site title/wordmark: **"The Human OS"**, subtitle: *"Your Body's Operating System"**, shown once at the top, minimal.
- **"Continue reading" card** at the top of the page (see §4.3) — only shown if the user has a saved bookmark; hidden entirely for first-time visitors.
- Below that, the 5 sections listed in order, each as a collapsible/expandable group (or simply always-expanded — acceptable for v1 given the content size).
- Each article listed under its section shows:
  - Title
  - One-line summary
  - Reading time
  - A visited/read indicator (checkmark or filled dot) once the reader has opened it — see §4.4
- Clicking an article title navigates to `article.html` with the right params.

### 4.2 Article page (`article.html`)
- Renders the markdown content for the given section/slug.
- Layout: single centered column, max-width ~680px, Medium-style typography (see §5).
- **Header:** small "← All articles" link back to the TOC, plus section name as a breadcrumb (e.g., "Hormones").
- **Footer nav:** "Previous article" / "Next article" links based on manifest order — this is how a reader moves through the course sequentially, Medium-style.
- Sources section rendered distinctly at the very end (§3.3).
- Reading time shown near the title.

### 4.3 Auto-bookmarking / "pick up where you left off" (required feature)
- On every article page, track reading progress via scroll position:
  - On scroll (throttled/debounced, e.g., every 500ms) and on `beforeunload`, save to `localStorage`:
    ```json
    {
      "lastArticle": { "section": "02-hormones", "slug": "02-cortisol", "title": "Cortisol and the Stress Response" },
      "scrollPercent": 62,
      "timestamp": 1735500000000
    }
    ```
- On the home page load, read this value:
  - If it exists, show a prominent card near the top: *"Continue reading: **Cortisol and the Stress Response** — 62% done"* with a button/link that opens the article and **restores scroll position** to where they left off.
  - If `scrollPercent` is ≥ ~95%, treat the article as finished — don't show a "continue" card for it; instead just reflect it as read in the TOC (§4.4).
- This should require no login and work purely client-side per browser/device.

### 4.4 Read/visited tracking
- Maintain a `localStorage` set/object of visited slugs (e.g., `{"02-hormones/02-cortisol": {"visited": true, "completedAt": ...}}`).
- Mark an article visited as soon as it's opened; mark it "completed" once scroll reaches ~90-95%.
- Reflect this in the TOC: a small checkmark or filled/outlined dot per article. Optional: a simple overall progress bar at the top of the TOC ("14 / 37 articles read").

### 4.5 Search (nice-to-have, included in scope)
- A simple search/filter input at the top of the TOC page.
- Filters the visible article list live as the user types, matching against title and summary (client-side substring match is sufficient; `Fuse.js` fuzzy search is a nice but optional upgrade).
- No need to search full article body text in v1.

### 4.6 Reading time estimate (nice-to-have, included in scope)
- Auto-calculate from word count (≈200 words/minute) unless front matter provides it — see §3.5.
- Display on both the TOC (per article) and the article page header.

### 4.7 Dark mode (nice-to-have, included in scope)
- A simple sun/moon toggle in the header, persisted in `localStorage`.
- Respect `prefers-color-scheme` as the default on first visit if no preference is saved yet.
- Dark palette should still feel like Medium's dark mode: near-black background (not pure `#000`), off-white text (not pure `#fff`), same serif body font.

---

## 5. Design Specification (Medium-like look & feel)

- **Layout:** single column, centered, `max-width: 680px` for article body text; TOC page can be slightly wider (~740-800px) since it has list items, not prose.
- **Typography:**
  - Body text: serif font stack, e.g. `Georgia, 'Charter', 'Iowan Old Style', serif`
  - UI chrome (nav, buttons, metadata): sans-serif, e.g. `-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif`
  - Body font size: ~19-21px, line-height ~1.6-1.7
  - Generous paragraph spacing (`margin-bottom: 1.4em` or similar)
- **Color palette:**
  - Light mode: background `#ffffff` or `#fafafa`, text `#242424`, muted/secondary text `#6b6b6b`, accent color used sparingly (e.g., a single link/accent color, not a rainbow of UI colors)
  - Dark mode: background `#1a1a1a`, text `#e8e8e8`, muted `#a0a0a0`
- **No sidebar, no heavy nav bar.** Header is minimal: wordmark/logo (small, top-left or centered) + dark mode toggle + (on article pages) back-to-contents link.
- **No decorative images required.** This is a text-first product; don't invent stock photography. If diagrams are ever added later (e.g., a simple hormone feedback-loop diagram), keep them simple/line-art style — out of scope for v1 unless requested.
- **Sources block:** smaller font (~14-15px), muted color, top border separator, extra top margin to visually separate from the article body.
- **Buttons/links:** minimal — underlined text links or simple text buttons, no heavy drop shadows, no rounded-pill gradient buttons. Medium's aesthetic is restrained.

---

## 6. Manifest Schema (`manifest.json`)

This file is the single source of truth for site structure/order and should be hand-maintained or generated by a small script, not hardcoded into HTML.

```json
{
  "sections": [
    {
      "id": "01-systems-overview",
      "title": "Systems Overview",
      "order": 1,
      "articles": [
        {
          "slug": "00-intro",
          "title": "Why Systems Thinking Matters for Your Body",
          "order": 0,
          "summary": "A quick map of how your body's major systems talk to each other.",
          "path": "content/01-systems-overview/00-intro.md"
        }
      ]
    }
  ]
}
```
The app should be able to compute prev/next navigation purely from flattening this manifest in order.

---

## 7. Important Notes for the Building Agent

1. **Content accuracy is the highest priority feature of this entire project.** If generating article content, cross-check facts before writing, prefer conservative/well-established claims over interesting-but-shaky ones, and always populate the `## Sources` section with real, verifiable sources — do not fabricate URLs or citations.
2. **Do not silently skip the Sources section** on any article, even placeholder/draft ones — flag any article missing sources rather than shipping it.
3. **Keep v1 dependency-light.** Resist the urge to add a frontend framework, CSS framework (Tailwind is fine if the agent strongly prefers it, but plain CSS is equally acceptable and keeps the project simpler), or state management library. This is a small, static, content-heavy site — simplicity is a feature.
4. **Build incrementally and testably:** get the manifest + TOC + one full section (e.g., Hormones) rendering end-to-end with bookmarking working before writing all remaining content. Validate the reading/bookmarking mechanics early since they're the most complex part technically.
5. **Mobile-first CSS** — verify the reading column and TOC both work well on a narrow viewport before polishing desktop details.
6. **Accessibility basics:** semantic HTML (`<article>`, `<nav>`, `<h1>`-`<h3>` hierarchy), sufficient color contrast in both light/dark modes, keyboard-navigable links, `alt` text if any icons/images are added.
7. **No tracking/analytics** unless explicitly requested later — this is a personal learning tool, not a public product with growth metrics.
8. **Naming:** site title is **"The Human OS"**, tagline **"Your Body's Operating System"** — use consistently in `<title>` tags, header, and any meta description.
9. **License/attribution note:** since content draws heavily on NIH/Mayo Clinic/etc., there's no copyright issue with citing them as sources with links, but do not copy their text verbatim — all article content should be written in original wording, with sources linked for verification, not quoted at length.

---

## 8. Suggested Build Order (for the agent)

1. Scaffold file structure + empty manifest.
2. Build static shell: `index.html` (TOC layout, no data), `article.html` (article layout, no data), shared `style.css` (Medium-style typography/colors, light + dark).
3. Wire up manifest loading + TOC rendering from `manifest.json`.
4. Wire up article rendering: fetch `.md` → parse front matter → render with marked.js → inject prev/next nav.
5. Implement bookmarking + read-tracking in `app.js` (localStorage read/write, scroll tracking, "Continue reading" card on TOC).
6. Implement dark mode toggle + persistence.
7. Implement search/filter box on TOC.
8. Implement reading-time calculation.
9. Write content section by section (Systems Overview → Hormones → Nutrition → Sleep → Lifestyle), each article with front matter + body + Sources block, fact-checked as you go.
10. Final pass: mobile responsiveness check, accessibility check, dead-link check on all sources.

---

*End of requirements document.*
