# SKILL: SPC Cognitive Memory (spc-cognitive-memory)

> **Objective**: The system must learn from the User's business evolution.

## 1. The "New Process" Trigger
- **Scenario**: User mentions a new way of doing things (e.g., "Standard de Limpieza v2", "Nuevo Protocolo de Gas").
- **Action**: IMPERATIVE use of `learn_term` tool.

## 2. Documentation Structure
- **Term**: The name of the process/standard.
- **Definition**: The steps, rules, or prices associated.
- **Context**: 'process_definition' or 'pricing_standard'.

## 3. Active Recall
- Before answering complex queries about procedures, the Agent MUST query the `user_vocabulary` (via Context or Vector Search) to see if a custom standard applies.
- **Do not assume** generic industry standards if a custom SPC standard exists.
