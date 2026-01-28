---
name: spc-development-preferences
description: User's development preferences and coding philosophy for SPC project
---

# SPC Development Preferences

## 🎯 Core Philosophy

**ALWAYS PREFER REUSING EXISTING COMPONENTS OVER CREATING NEW ONES**

## 📋 Development Rules

### 1. Component Reuse (CRITICAL)
- **BEFORE** creating any new component, ALWAYS:
  1. Search for existing similar components in the codebase
  2. Check if an existing component can be adapted/extended
  3. **ASK THE USER** if unsure whether to create new or reuse existing
  
- **Example**: In expense registration unification, we successfully reused `ProcesadorImagen` (the most complete component) across 3 locations instead of creating new forms.

### 2. Consultation-First Approach
- When facing a choice between:
  - Creating a new component
  - Modifying an existing component
  - Using a different architecture
  
  **→ CONSULT THE USER FIRST**

### 3. Simplification Over Feature Creep
- Prefer removing complexity over adding it
- Tabs/nested navigation should be questioned
- Clean, direct UX is preferred
- **Example**: Removed ~100 lines of tabs from gastos page to create ultra-simple flow

### 4. Consistency is Key
- If a pattern works well in one place, replicate it elsewhere
- Don't create multiple ways to do the same thing
- **Example**: Same `ProcesadorImagen` used in `/tareas/[id]`, `/gastos`, and chat

## 🔍 Before Implementing

**Checklist**:
- [ ] Have I searched for existing components?
- [ ] Can I reuse/adapt something that already exists?
- [ ] Have I consulted the user if uncertain?
- [ ] Is this the simplest possible solution?
- [ ] Am I maintaining consistency with existing patterns?

## 🎨 Design Preferences

### UI Simplicity
- **Minimal tabs**: Only when absolutely necessary
- **Direct flows**: Button → Action (fewest steps)
- **Clear labels**: Self-explanatory without documentation
- **Clean screens**: Avoid information overload

### Code Quality
- **DRY (Don't Repeat Yourself)**: Reuse over duplication
- **Single Responsibility**: Components do one thing well
- **Maintainability**: Code should be easy to understand and modify
- **Documentation**: Inline comments for complex logic

## ⚠️ Anti-Patterns to Avoid

❌ Creating new components when existing ones work  
❌ Adding features without discussing with user  
❌ Complex nested structures (tabs within tabs)  
❌ Multiple similar components doing the same thing  
❌ Reinventing the wheel  

## ✅ Preferred Patterns

✅ Reuse existing, battle-tested components  
✅ Consult before major architectural decisions  
✅ Simplify and reduce code when possible  
✅ Maintain consistency across the codebase  
✅ One component, multiple locations  

---

**Last Updated**: 2026-01-28  
**Project**: SPC (Sistema de Presupuestos de Construcción)  
**User Preference Level**: CRITICAL - Always follow
