---
name: first-time-setup
description: First-time setup flow for laoli-image-cards preferences
---

# First-Time Setup

## Overview

When no config exists for this skill, guide user through preference setup.

**⛔ BLOCKING OPERATION**: This setup MUST complete before ANY other workflow steps. Do NOT:
- Ask about content/article
- Ask about style or layout
- Ask about target audience
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

**Language**: Use user's input language or saved language preference.

Use single AskUserQuestion with multiple questions (AskUserQuestion auto-adds "Other" option):

### Question 1: Watermark

```
header: "Watermark"
question: "Watermark text for generated images? Type your watermark content (e.g., name, @handle)"
options:
  - label: "No watermark (Recommended)"
    description: "No watermark, can enable later via laoli recipe set"
```

Position defaults to bottom-right.

### Question 2: Preferred Style

```
header: "Style"
question: "Default visual style preference? Or type another style name or your custom style"
options:
  - label: "None (Recommended)"
    description: "Auto-select based on content analysis"
  - label: "cute"
    description: "Sweet, adorable - classic XHS aesthetic"
  - label: "notion"
    description: "Minimalist hand-drawn, intellectual"
```

## After Setup

1. Save each answer via `laoli recipe set --skill laoli-image-cards --key <key> --value <value>`
2. Confirm: "Preferences saved"
3. Continue to Step 1

## Modifying Preferences Later

Users can modify config anytime via:

```bash
laoli recipe set --skill laoli-image-cards --key <key> --value <value>
laoli recipe get --skill laoli-image-cards
laoli recipe schema --skill laoli-image-cards
```
