---
name: claymorphism-ui
description: 'Create UI components and layouts in the claymorphism style — soft, inflated, 3D-looking clay objects floating above the background. Use when asked for claymorphism, clay UI, inflated components, soft UI, 3D card effect, pastel bubbly interface, playful landing page, candy-like dashboard, or tactile button styles. Applies to React, HTML/CSS, and Tailwind projects. Do NOT use for dense admin tables, data-heavy layouts, or when the user wants flat/minimal design.'
argument-hint: 'component type or layout (e.g. "card", "button", "login form", "landing page")'
---

# Claymorphism UI

## When to Use
- User asks for claymorphism, clay-style, or inflated 3D UI
- Building landing pages, onboarding screens, or product showcase cards
- Music, kids, creative, or lifestyle app interfaces
- Experimental or playful dashboards
- User wants soft, pastel, tactile, or bubbly design language

## Do NOT Use
- Dense admin tables or data-heavy layouts
- Highly text-heavy reports or invoices
- When user explicitly wants flat, minimal, or brutalist design

---

## Visual Principles

| Property | Value |
|----------|-------|
| Border radius | 24px–48px on cards; pill (`9999px`) on buttons |
| Shadows | Outer lift + two inset (highlight + depth) |
| Colors | Pastels, candy, or smooth vibrant hues |
| Padding | Generous — `2rem` to `3rem` inside cards |
| Borders | None, or 1px in a slightly lighter shade of the base color |
| Typography | Rounded or soft fonts preferred (e.g. Nunito, Poppins) |

---

## CSS Shadow Formula

```css
/* Core claymorphism shadow stack */
box-shadow:
  8px 8px 24px rgba(0, 0, 0, 0.18),          /* outer lift/elevation */
  inset -4px -4px 10px rgba(0, 0, 0, 0.12),   /* inner depth (darker edge) */
  inset 4px 4px 10px rgba(255, 255, 255, 0.6); /* inner highlight (lighter edge) */
```

Scale shadow sizes proportionally:
- Small button → `4px 4px 12px` outer, `2px 2px 6px` inset
- Large hero card → `12px 12px 40px` outer, `6px 6px 16px` inset

---

## Procedure

### 1. Identify the Component
Determine what the user wants (card, button, form, nav, layout). If not specified, infer from the argument-hint or context.

### 2. Choose Color Context
- Ask or infer a base palette (pastel blue, mint, lavender, peach, etc.)
- Derive inset shadow colors from the base: slightly darker for depth, slightly lighter/white for highlight

### 3. Apply Component Rules (see below)

### 4. Deliver Code
Output clean, self-contained CSS/Tailwind/JSX. Include a usage example. Note any accessibility considerations (contrast ratio, focus ring).

### 5. Offer Variants
After delivering, offer: hover state, dark-mode variant, or an animation (gentle float / press effect).

---

## Component Rules

### Cards
```css
.clay-card {
  background: #a8d8ea;           /* pastel base */
  border-radius: 32px;
  padding: 2rem 2.5rem;
  box-shadow:
    8px 8px 24px rgba(0, 0, 0, 0.18),
    inset -4px -4px 10px rgba(0, 0, 0, 0.12),
    inset 4px 4px 10px rgba(255, 255, 255, 0.55);
}
```

### Buttons
```css
.clay-button {
  background: #ffb347;
  border: none;
  border-radius: 9999px;         /* pill shape */
  padding: 0.75rem 2rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow:
    4px 4px 12px rgba(0, 0, 0, 0.2),
    inset -2px -2px 6px rgba(0, 0, 0, 0.15),
    inset 2px 2px 6px rgba(255, 255, 255, 0.6);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}
.clay-button:hover {
  transform: translateY(-2px);
  box-shadow:
    6px 10px 20px rgba(0, 0, 0, 0.22),
    inset -2px -2px 6px rgba(0, 0, 0, 0.15),
    inset 2px 2px 6px rgba(255, 255, 255, 0.6);
}
.clay-button:active {
  transform: translateY(1px);
  box-shadow:
    2px 2px 8px rgba(0, 0, 0, 0.18),
    inset -1px -1px 4px rgba(0, 0, 0, 0.12),
    inset 1px 1px 4px rgba(255, 255, 255, 0.5);
}
```

### Inputs
```css
.clay-input {
  background: #f0e6ff;
  border: none;
  border-radius: 16px;
  padding: 0.75rem 1.25rem;
  box-shadow:
    inset 4px 4px 10px rgba(0, 0, 0, 0.12),
    inset -2px -2px 6px rgba(255, 255, 255, 0.6);
  outline: none;
  transition: box-shadow 0.2s ease;
}
.clay-input:focus {
  box-shadow:
    inset 4px 4px 10px rgba(0, 0, 0, 0.15),
    inset -2px -2px 6px rgba(255, 255, 255, 0.6),
    0 0 0 3px rgba(168, 132, 255, 0.5);  /* accessible focus ring */
}
```

---

## Tailwind Utility Approach

When the project uses Tailwind CSS, extend `tailwind.config` with a `claymorphism` plugin or use inline `style` for the custom shadow stack (Tailwind's built-in shadows can't express the inset combination).

```tsx
// Recommended: inline style for the shadow, Tailwind for everything else
<div
  className="rounded-[32px] bg-[#a8d8ea] p-10"
  style={{
    boxShadow:
      '8px 8px 24px rgba(0,0,0,0.18), inset -4px -4px 10px rgba(0,0,0,0.12), inset 4px 4px 10px rgba(255,255,255,0.55)',
  }}
>
  {children}
</div>
```

---

## Accessibility Checklist
- [ ] Text-to-background contrast ratio ≥ 4.5:1 (WCAG AA)
- [ ] Focus rings are visible (do not remove `outline`, use a styled alternative)
- [ ] Do not rely on shadow alone to convey meaning — use labels/icons too
- [ ] Ensure hover/active states are keyboard-reachable

---

## Pastel Color Palette Reference

| Name | Hex | Use for |
|------|-----|---------|
| Sky blue | `#a8d8ea` | Cards, containers |
| Peach | `#ffcc99` | Warm cards, highlights |
| Lavender | `#d5b8ff` | Inputs, secondary cards |
| Mint | `#b5ead7` | Success states, nature themes |
| Candy pink | `#ffb3c6` | Buttons, accents |
| Lemon | `#fff0a0` | Highlights, badges |

---

## Anti-Patterns
- **Thin 1px black borders** — kills the inflated feel
- **Small `border-radius` (<12px)** — makes components look flat
- **Harsh `rgba(0,0,0,0.5)` shadows** — too heavy, not clay-like
- **Dense tables with clay style** — cluttered and hard to read
- **Skipping inset shadows** — loses the 3D molded illusion
