---
name: first-time-setup
description: First-time setup flow for laoli-comic preferences
---

# First-Time Setup

## Overview

When no config exists for this skill, guide user through preference setup.

**⛔ BLOCKING OPERATION**: This setup MUST complete before ANY other workflow steps. Do NOT:
- Ask about content/source material
- Ask about art style or tone
- Ask about layout preferences
- Proceed to content analysis

ONLY ask the questions below, then save via `laoli recipe set`, then continue.

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
    Continue to Step 1
```

## Questions

**Language**: Use user's input language or preferred language for all questions. Do not always use English.

Use single AskUserQuestion with multiple questions (AskUserQuestion auto-adds "Other" option):

### Question 1: Watermark

```
header: "Watermark"
question: "Watermark text for generated comic pages? Type your watermark content (e.g., name, @handle)"
options:
  - label: "No watermark (Recommended)"
    description: "No watermark, can enable later via laoli recipe set"
```

Position defaults to bottom-right.

### Question 2: Preferred Art Style

```
header: "Art"
question: "Default art style preference? Or type another style name"
options:
  - label: "Auto-select (Recommended)"
    description: "Auto-select based on content analysis"
  - label: "ligne-claire"
    description: "Uniform lines, flat colors, European comic (Tintin style)"
  - label: "manga"
    description: "Japanese manga style, expressive eyes and emotions"
  - label: "realistic"
    description: "Digital painting, sophisticated and professional"
```

### Question 3: Preferred Tone

```
header: "Tone"
question: "Default tone/mood preference?"
options:
  - label: "Auto-select (Recommended)"
    description: "Auto-select based on content signals"
  - label: "neutral"
    description: "Balanced, rational, educational"
  - label: "warm"
    description: "Nostalgic, personal, comforting"
  - label: "dramatic"
    description: "High contrast, intense, powerful"
```

### Question 4: Language

```
header: "Language"
question: "Output language for comic text?"
options:
  - label: "Auto-detect (Recommended)"
    description: "Match source content language"
  - label: "zh"
    description: "Chinese (中文)"
  - label: "en"
    description: "English"
```

## After Setup

1. Save each answer via `laoli recipe set --skill laoli-comic --key <key> --value <value>`
2. Confirm: "Preferences saved"
3. Continue to Step 1

## Modifying Preferences Later

Users can modify config anytime via:

```bash
laoli recipe set --skill laoli-comic --key <key> --value <value>
laoli recipe get --skill laoli-comic
laoli recipe schema --skill laoli-comic
```
