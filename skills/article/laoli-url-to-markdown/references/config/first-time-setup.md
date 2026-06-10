---
name: first-time-setup
description: First-time setup flow for laoli-url-to-markdown preferences
---

# First-Time Setup

## Overview

When no config exists for this skill, guide user through preference setup.

**BLOCKING OPERATION**: This setup MUST complete before ANY other workflow steps. Do NOT:
- Start converting URLs
- Ask about URLs or output paths
- Proceed to any conversion

ONLY ask the questions below, then save via `laoli recipe set`, then continue.

## Setup Flow

```
No config found
        |
        v
+---------------------+
| AskUserQuestion     |
| (all questions)     |
+---------------------+
        |
        v
+-----------------------------+
| Save via laoli recipe set   |
+-----------------------------+
        |
        v
    Continue conversion
```

## Questions

**Language**: Use user's input language or saved language preference.

Use AskUserQuestion with ALL questions in ONE call:

### Question 1: Download Media

```yaml
header: "Media"
question: "How to handle images and videos in pages?"
options:
  - label: "Ask each time (Recommended)"
    description: "After saving markdown, ask whether to download media"
  - label: "Always download"
    description: "Always download media to local imgs/ and videos/ directories"
  - label: "Never download"
    description: "Keep original remote URLs in markdown"
```

### Question 2: Default Output Directory

```yaml
header: "Output"
question: "Default output directory?"
options:
  - label: "url-to-markdown (Recommended)"
    description: "Save to ./url-to-markdown/{domain}/{slug}.md"
```

Note: User will likely choose "Other" to type a custom path.

## After Setup

1. Save each answer via `laoli recipe set --skill laoli-url-to-markdown --key <key> --value <value>`
2. Confirm: "Preferences saved"
3. Continue with conversion using saved preferences

## Modifying Preferences Later

Users can modify config anytime via:

```bash
laoli recipe set --skill laoli-url-to-markdown --key <key> --value <value>
laoli recipe get --skill laoli-url-to-markdown
laoli recipe schema --skill laoli-url-to-markdown
```
