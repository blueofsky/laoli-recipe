---
name: first-time-setup
description: First-time setup flow for laoli-infographic preferences
---

# First-Time Setup

## Overview

When no config exists for this skill, guide the user through preference setup before generating any infographic.

**⛔ BLOCKING OPERATION**: This setup MUST complete before ANY other workflow steps. Do NOT:
- Ask about source content or topic
- Ask about layout, style, or aspect
- Begin Step 1.2 content analysis

ONLY ask the questions below, then save via `laoli recipe set`, then continue to Step 1.2.

## Setup Flow

```
No config found
        │
        ▼
┌─────────────────────┐
│ AskUserQuestion     │
│ (all questions)     │
└─────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ Save via laoli recipe set   │
└─────────────────────────────┘
        │
        ▼
    Continue to Step 1.2
```

## Questions

**Language**: Use the user's input language for question text. Do not always default to English.

Use a single `AskUserQuestion` with multiple questions (the runtime auto-adds an "Other" option):

### Question 1: Preferred Layout

```
header: "Layout"
question: "Default layout preference?"
options:
  - label: "Auto-select (Recommended)"
    description: "Pick layout per content in Step 3"
  - label: "bento-grid"
    description: "Multiple topics, overview (general default)"
  - label: "linear-progression"
    description: "Timelines, processes, tutorials"
  - label: "dense-modules"
    description: "High-density modules, data-rich guides"
```

### Question 2: Preferred Style

```
header: "Style"
question: "Default visual style preference?"
options:
  - label: "Auto-select (Recommended)"
    description: "Pick style per tone in Step 3"
  - label: "craft-handmade"
    description: "Hand-drawn, paper craft (general default)"
  - label: "corporate-memphis"
    description: "Flat vector, vibrant"
  - label: "morandi-journal"
    description: "Hand-drawn doodle, warm Morandi tones"
```

### Question 3: Preferred Aspect

```
header: "Aspect"
question: "Default aspect ratio?"
options:
  - label: "Auto-select (Recommended)"
    description: "Pick per layout in Step 4"
  - label: "landscape"
    description: "16:9 (slides, blogs, web)"
  - label: "portrait"
    description: "9:16 (mobile, social, dense modules)"
  - label: "square"
    description: "1:1 (social, thumbnails)"
```

### Question 4: Language

```
header: "Language"
question: "Output language for infographic text?"
options:
  - label: "Auto-detect (Recommended)"
    description: "Match source content language"
  - label: "zh"
    description: "Chinese (中文)"
  - label: "en"
    description: "English"
```

## After Setup

1. Save each answer via `laoli recipe set --skill laoli-infographic --key <key> --value <value>`
2. Confirm: "Preferences saved"
3. Continue to Step 1.2

## Modifying Preferences Later

Users can modify config anytime via:

```bash
laoli recipe set --skill laoli-infographic --key <key> --value <value>
laoli recipe get --skill laoli-infographic
laoli recipe schema --skill laoli-infographic
```
