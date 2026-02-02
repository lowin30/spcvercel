---
name: UI Tool Preference
description: Guidelines for preferring interactive UI tools over conversational data gathering.
---

# UI Tool Preference Policy

## Core Principle
If a specialized UI tool or dialog exists for a task (e.g., Creating Departments, Assigning Tasks, Registering Payments), the AI MUST prioritize opening that interface immediately rather than collecting information via chat conversation.

## Rules

1.  **Immediate Invocation**: Once the minimum required arguments for a tool are known (e.g., `id_edificio` for department creation), invoke the tool immediately.
2.  **Avoid Redundancy**: Do not ask the user for information that they will have to enter again in the form (e.g., department name, description, contact details).
3.  **Discovery**: Use helper tools (like `buscar_edificios`) to find the necessary IDs to launch the main tool.
4.  **Confirm, Don't Interrogate**: If parameters are ambiguous, it is better to open the tool (perhaps with a broad search or empty state if supported) than to trap the user in a text-based Q&A loop.

## Example: Create Department

**Bad:**
User: "Create dept in Building A"
AI: "OK. What is the unit number? What is the contact name?"
(User types info...)
AI: "OK, creating..."

**Good:**
User: "Create dept in Building A"
AI: (Calls `buscar_edificios` -> get ID -> Calls `crear_departamento(ID)`)
UI: *Opens Form*
AI: "Opening the form for Building A..."

## Implementation Strategy for New Tools
When adding new tools, ensure the `description` field explicitly instructs the LLM to use this policy.
Example: `...EJECUTA ESTA TOOL INMEDIATAMENTE. NO preguntes por chat...`
