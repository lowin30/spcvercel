---
name: Super Intelligence & Data Resolution
description: Advanced rules for data searching, fuzzy matching, and field inference.
---

# Super Intelligent Data Resolution

## Core Philosophy
The User expects you to be "Super Intelligent". This means:
1.  **Never Fail on Typos**: If "Ohigins" doesn't match "O'Higgins", you MUST find it anyway.
2.  **Broad Field Search**: When searching for Entities (like Buildings), assume synonyms:
    - "Title" (Título) = "Name" (Nombre)
    - "Address" (Dirección) can contain the Name.
    - "Name" can contain the Address.
3.  **Proactive Fallbacks**: If a specific search fails, IMMEDIATELY try broader searches (splitting words, removing numbers, searching by number only) BEFORE asking the user for clarification.

## Implementation Guidelines

### Building Search (buscar_edificios)
- Always search `nombre` AND `direccion`.
- If precise match fails, split the input into "Bag of Words" and match ANY meaningful word against ANY field.
- Example: "Create dept in Ohigins 2470"
    - "Ohigins" -> Matches "O'Higgins" (via fuzzy partial match)
    - "2470" -> Matches "Av. Libertador 2470" (via address match)
    - The intersection or best match wins.

### Handling "Title" vs "Name"
- If the user refers to a "Title" field, automatically map it to the `nombre` column in the database.
- Do not correct the user ("It's called Name, not Title"). Just understand them and act.

## Tool Behavior
- Tools should implement this internal retry logic so the Agent doesn't have to loop.
- The Agent should trust the tool's "intelligent" results.
