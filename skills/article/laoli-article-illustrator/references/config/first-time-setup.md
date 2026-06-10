---
name: first-time-setup
description: First-time setup flow for laoli-article-illustrator preferences
---

# First-Time Setup

## Overview

When no config exists for this skill, guide user through preference setup.

**⛔ BLOCKING OPERATION**: This setup MUST complete before ANY other workflow steps. Do NOT:
- Ask about reference images
- Ask about content/article
- Ask about type or style preferences
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
question: "Watermark text for generated illustrations? Type your watermark content (e.g., name, @handle)"
options:
  - label: "No watermark (Recommended)"
    description: "No watermark, can enable later via laoli recipe set"
```

Position defaults to bottom-right.

### Question 2: Preferred Style

```
header: "Style"
question: "Default illustration style preference? Or type another style name or your custom style"
options:
  - label: "None (Recommended)"
    description: "Auto-select based on content analysis"
  - label: "notion"
    description: "Minimalist hand-drawn line art"
  - label: "warm"
    description: "Friendly, approachable, personal"
```

### Question 3: Output Directory

```
header: "Output Directory"
question: "Where to save generated illustrations when illustrating a file?"
options:
  - label: "imgs-subdir (Recommended)"
    description: "{article-dir}/imgs/ — images in a subdirectory next to the article"
  - label: "same-dir"
    description: "{article-dir}/ — images alongside the article file"
  - label: "illustrations-subdir"
    description: "{article-dir}/illustrations/ — separate illustrations subdirectory"
  - label: "independent"
    description: "illustrations/{topic-slug}/ — standalone directory in cwd"
```

## After Setup

1. Save each answer via `laoli recipe set --skill laoli-article-illustrator --key <key> --value <value>`
2. Confirm: "Preferences saved"
3. Continue to Step 1

## Modifying Preferences Later

Users can modify config anytime via:

```bash
laoli recipe set --skill laoli-article-illustrator --key <key> --value <value>
laoli recipe get --skill laoli-article-illustrator
laoli recipe schema --skill laoli-article-illustrator
```
