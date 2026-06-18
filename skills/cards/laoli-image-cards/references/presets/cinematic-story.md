---
name: cinematic-story
category: narrative
---

# Cinematic Story Style

Cinematic photorealistic film-still aesthetic for historical narrative image card series.
Each card feels like a frame from a movie — dark moody atmosphere, dramatic lighting, bold text overlay on photographic scenes.

## Element Combination

```yaml
canvas:
  ratio: portrait-9-16
  grid: single | dual-split

image_effects:
  cutout: none
  stroke: none
  filter: film-grain | muted-tones | none

typography:
  decorated: bold-white-overlay
  tags: none
  direction: horizontal

decorations:
  emphasis: none
  background: dark-gradient | dark-solid
  doodles: none
  frames: none
```

## Color Palette

| Role | Colors | Hex |
|------|--------|-----|
| Background | Deep navy, near-black, midnight blue | #0A0E17, #111827, #1A1F35 |
| Primary Light | Golden amber (warmth/hope) | #D4A574, #E8B86D, #F5D485 |
| Crisis Light | Red alarm glow (danger/tension) | #DC2626, #EF4444, #B91C1C |
| Cool Light | Cold steel blue (calm/reason) | #60A5FA, #3B82F6, #1E40AF |
| Text | Bold white, pure white | #FFFFFF, #F8FAFC |

**Lighting Rule**: Each card uses exactly ONE dominant light source direction and color.
- Cover: golden/amber point light on symbol object
- Background cards: environmental ambient (moonlight / screen glow)
- Character cards: dramatic single-side lighting (Rembrandt / chiaroscuro)
- Climax cards: highest contrast, split or radial lighting
- Quote card: warm horizon glow (golden hour)
- Transition card: gradient morph between two color temperatures

## Visual Elements

- Photorealistic scenes, no illustration/cartoon elements
- Film grain texture optional for period authenticity
- Shallow depth of field on character portraits
- Atmospheric haze, smoke, rain, sea spray for mood
- Symbol objects as visual anchors (button, badge, medal, valve)
- Split-screen composition for time-lapse / before-after effects

## Typography

- **Bold white Chinese text**, sans-serif, high weight
- Rendered directly by image generation model (GPT Image 2 / Seedream / etc.)
- Position rules per slot (see Fixed 8-Card Structure below):
  - Slot 1 (cover): upper-center, large, series title
  - Slots 2-6 (content): bottom area, medium, factual/emotional text
  - Slot 7 (quote): center, large, punchline only
  - Slot 8 (transition): top (summary), center (#hashtag), bottom (next episode tease)
- Fallback: if model generates garbled Chinese, regenerate or post-edit with image tool

## Fixed 8-Card Structure

This style enforces a rigid 8-card template (not variable count). Each slot has defined purpose, composition pattern, and text position.

| Slot | Name | Purpose | Composition Pattern | Light | Text Position |
|------|------|---------|-------------------|-------|---------------|
| **01** | Cover/Hook | Stop the scroll | **Symbol close-up**: iconic object floating in darkness with inner reflection/glow. Series title visible. | Single golden/amber point light on symbol | Upper-center, large |
| **02** | Context | Establish time & place | **Wide establishing shot**: landscape/event at scale. Reader understands WHERE and WHEN. | Environmental ambient (night sky / interior lighting) | Bottom, factual statement |
| **03** | Protagonist | Introduce the person | **Character portrait**: face/upper body, expressive pose, intense emotion readable. | Dramatic single-side (Rembrandt / screen-glow on face) | Bottom, character intro |
| **04** | Turning Point | The crisis moment | **Action/dilemma scene**: character in peril or decision moment, physical tension visible. | Dark with one breakthrough light source | Bottom, the stakes |
| **05** | Climax | The decision/consequence | **Conceptual composition**: abstract representation of choice, countdown, revelation. Highest drama. | Maximum contrast, split or radial | Center or bottom |
| **06** | Aftermath | What happened next | **Split-screen contrast**: young ↔ old / before ↔ after / cause ↔ effect. Smooth transition zone. | Gradient transition between two moods | Bottom, consequence |
| **07** | Quote/Punchline | Emotional peak | **Minimalist still life**: ONE object in vast empty space. Negative space does the work. | Golden hour / warm horizon glow | Center, the line that sticks |
| **08** | Transition/Series Card | Bridge to next episode | **Symbol morph**: this episode's symbol → next episode's hint. Dark gradient base. | Dark gradient with dual-color temperature | Top + center + bottom (3 parts) |

## Per-Slot Prompt Template

### Slot 01 — Cover
```
Dark cinematic poster, 9:16 vertical. A single [SYMBOL_OBJECT] floating in center with [LIGHT_COLOR] glow,
[DETAIL_REFLECTION] reflected inside. Deep [BG_COLOR] gradient background with subtle [ATMOSPHERE].
Bold white Chinese text at top: "[SERIES_TITLE]". Smaller text below: "[SUBTITLE]".
Movie poster style, dramatic lighting, moody atmosphere, photorealistic.
```

### Slot 02 — Context
```
[TIME] [LOCATION] [SCENE_DESCRIPTION], [WIDE_SHOT_ANGLE]. [KEY_ELEMENTS_VISIBLE].
[COLOR_PALETTE] palette, [ENVIRONMENTAL_LIGHT]. White Chinese text overlay at bottom: "[FACT_STATEMENT]".
Cinematic film still, photorealistic, 9:16 vertical.
```

### Slot 03 — Protagonist
```
Close-up dramatic portrait, [ERA] [CHARACTER_DESC], [POSE/ACTION]. [BACKGROUND_CONTEXT].
[LIGHTING_TYPE] casting on face, [EMOTION] expression visible in eyes.
White Chinese text at bottom: "[CHARACTER_INTRO]".
Cinematic portrait, dark moody, photorealistic, 9:16 vertical.
```

### Slot 04 — Turning Point
```
[ACTION_SCENE], [PHYSICAL_DETAILS]. [ENVIRONMENT].
Dark composition with [BREAKTHROUGH_LIGHT] piercing through.
White Chinese text at bottom: "[CRISIS_TEXT]".
Cinematic dramatic shot, high tension, 9:16 vertical.
```

### Slot 05 — Climax
```
[CONCEPTUAL_COMPOSITION], [ABSTRACT_ELEMENTS]. 
Maximum dramatic contrast, [SPECIAL_LIGHTING_EFFECT].
White Chinese text [POSITION]: "[CLIMAX_TEXT]".
Cinematic, emotionally charged, 9:16 vertical.
```

### Slot 06 — Aftermath
```
Split composition, left side: [YOUNG_VERSION], right side: [OLDER_VERSION/CONSEQUENCE].
[SHARED_BACKGROUND]. Smooth faded transition between eras.
White Chinese text at bottom: "[AFTERMATH_TEXT]".
Cinematic split portrait, photorealistic, 9:16 vertical.
```

### Slot 07 — Quote
```
Minimalist [SETTING] at [TIME_OF_DAY], a single [OBJECT] [POSITION_IN_FRAME]
on [SURFACE]. [LIGHTING_DESCRIPTION]. Vast empty space.
Poetic still life composition. Bold white Chinese text centered: "[PUNCHLINE]".
Clean cinematic, emotional, 9:16 vertical.
```

### Slot 08 — Transition
```
Dark [GRADIENT_COLOR] gradient background, [THIS_EPISODE_SYMBOL] on left
morphing into faint silhouette of [NEXT_EPISODE_HINT] on right,
split transition effect. Minimalist dramatic design.
White Chinese text: "[EP_SUMMARY]" at top, "#[HASHTAG]" centered, 
"[NEXT_EP_TEASE]" at bottom. Series card style, 9:16 vertical.
```

## Best Layout Pairings

This style uses a **fixed position-based layout** (not selectable). Each slot's layout is defined above.

| Slot | Effective Layout | Reason |
|------|-----------------|--------|
| 01 cover | sparse (symbol + title) | Max visual impact for scroll-stopping |
| 02 context | sparse (scene + fact) | Wide shot needs room |
| 03 protagonist | sparse (portrait + caption) | Face is the content |
| 04 turning-point | sparse (action + text) | Tension needs focus |
| 05 climax | sparse (concept + text) | Drama needs space |
| 06 aftermath | comparison (split-screen) | Before/after structure |
| 07 quote | sparse (object + centered text) | Minimalism = impact |
| 08 transition | sparse (3-part text) | Clean bridge between episodes |

**When used with `--layout` flag**: accept but override per-slot. Warn user that cinematic-story uses fixed positions.

## Best For

- Historical narrative series ("一个瞬间" format)
- Biographical storytelling (single person, destiny-changing moments)
- True crime / mystery events
- Any content where **emotional immersion > information density**
- Long-form story accounts (WeChat articles, video号 series)

## Not Suitable For

- Knowledge sharing / tutorials (use `notion`, `chalkboard`, `sketch-notes`)
- Product comparisons (use `bold`, `fresh`)
- Data-driven analysis (use `aged-academia` infographic)
- Lighthearted lifestyle content (use `cute`, `warm`, `fresh`)

## Generation Constraints (platform-derived)

These hard constraints shape prompt construction at generation time. They derive from the 视频号 image slideshow (图片连播) format — each card gets ~2.5s of pure display before a system-enforced crossfade. For full platform rationale, BGM sync, feed competition metrics, and card-count justification, see `laoli-cards-project`.

### Readability Budget

Each card has approximately **2.5 seconds of pure display time** before fade begins — the hard constraint shaping all text decisions:

- **Max 1 core message per card** — do NOT stack multiple facts
- **Max ~15 Chinese characters** for primary text (readable in 2.5s at a glance)
- **Secondary text** (if any) max ~8 characters, supporting role only
- **No paragraphs** — if a thought needs >1 sentence, split across consecutive cards
- **Long quotes** (slot 07): break into 2 cards if >12 characters, let rhythm carry it

### Adjacent-Card Color Continuity

The platform enforces a ~0.3-0.5s opacity crossfade between cards. To prevent jarring jumps:

- Adjacent cards must share **at least one dominant color**
- Enforced at prompt construction time — carry a base hue from slot N into slot N+1
- Slot 08 → slot 01 (loop point) must keep gradient base identical

### Climax Positioning

Slot 05 is the visual climax by design — this aligns with the typical BGM beat-drop / chorus entry around the ~15s mark of a 30s loop. See `laoli-cards-project` for full BGM synchronization rationale.

## Cross-Episode Consistency Rules

1. **Symbol continuity**: each episode's cover symbol should visually echo the series theme
2. **Transition chain**: slot 08 of episode N must visually lead to slot 01 of episode N+1
3. **Color temperature consistency**: within one episode, maintain coherent warmth/coolness (e.g., cold war = blue-red; maritime = navy-gold)
4. **Text voice**: all captions share the same tone — short, declarative, present tense where possible
5. **Aspect ratio lock**: always 9:16, never deviate

## Backend Notes

- **Preferred backends**: GPT Image 2 (best Chinese text rendering), Seedream 4.5+/5.0, DashScope qwen-image-2.0-pro
- **Reference chain**: generate image 01 first without ref, use image 01 as --ref for images 02-08
- **Session ID**: use `cinematic-{topic-slug}-{timestamp}` if backend supports it
- **Text quality check**: after generation, verify Chinese characters; ~20% error rate expected, plan for manual correction pass
