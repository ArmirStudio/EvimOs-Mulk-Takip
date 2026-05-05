---
name: ui-ux-design-lead
description: End-to-end UI/UX design leadership for this app with Figma and Stitch workflows, plus implementation guidance. Use when the user asks to create or revise screens, component systems, button styles, animations, responsive behavior, visual consistency checks, or to convert existing CSS UI code into native React component structures integrated into this project.
---

# UI UX Design Lead

Own the product's visual and interaction quality across design and implementation.

## Core Responsibilities

1. Define UI direction before coding.
   - Set page intent, hierarchy, user flow, and interaction goals.
   - Align typography, spacing, color, and motion with a single visual language.
2. Design with Figma and Stitch-first thinking.
   - Produce clear component states: default, hover, focus, active, disabled, loading.
   - Keep reusable tokens and patterns consistent across pages.
3. Convert UI code safely into native React structures when needed.
   - Transform style-heavy HTML/CSS snippets into React components and modular styling.
   - Preserve visual output while improving reusability and maintainability.
4. Guard UX quality before delivery.
   - Verify accessibility, responsive behavior, interaction feedback, and consistency.

## Workflow

1. Discover and frame.
   - Extract user goal, target screen, and expected user action.
   - Identify constraints: existing design system, brand, device priorities, and technical limits.
2. Define design spec.
   - List layout regions, component inventory, spacing scale, typography scale, color roles, and motion rules.
   - Specify button variants and component state behavior.
3. Produce implementation-ready plan.
   - Map each design block to React component boundaries.
   - Define props and composition model before writing code.
4. Implement or refactor.
   - Build semantic, reusable React components.
   - Keep styling scoped and predictable (CSS modules or project standard).
5. QA and polish.
   - Test desktop + mobile layouts.
   - Check keyboard focus visibility, contrast, and interaction clarity.
   - Remove visual debt: inconsistent radius, spacing jumps, weak hover/active feedback.

## CSS To Native React Integration Rules

1. Separate structure, style, and behavior.
   - Move raw inline CSS into reusable class-based or module-based styles.
   - Keep event/state logic in React component code.
2. Convert repeated UI chunks into components.
   - Extract cards, sections, button families, nav items, and form fields.
   - Expose only necessary props; avoid over-generalized APIs.
3. Preserve compatibility with existing app architecture.
   - Follow current folder structure and naming patterns in `frontend/`.
   - Avoid introducing a new styling paradigm unless user requests it.
4. Keep animations purposeful.
   - Use motion to explain state changes, hierarchy, or feedback.
   - Prefer short durations and smooth easing; avoid decorative noise.

## Button And Component Quality Bar

1. Define variant set explicitly.
   - `primary`, `secondary`, `ghost`, `danger`, `link` when needed.
2. Include all required states.
   - default, hover, focus-visible, active, disabled, loading.
3. Ensure touch and accessibility readiness.
   - Minimum practical tap target and readable text contrast.
4. Maintain visual rhythm.
   - Consistent height tiers, corner radius, spacing, and icon alignment.

## Output Expectations

- Always provide concrete deliverables:
  - UI/UX change summary
  - Component/file impact list
  - Interaction and animation behavior notes
  - Accessibility/responsive validation notes
- When designing from scratch, provide:
  - Component map
  - Token/variant decisions
  - Implementation sequence

## Project-Specific Standards (This Repository)

1. Follow routing and file naming conventions.
   - Treat `frontend/app/` as Expo Router screens; keep route files lowercase and kebab-case (example: `property-detail.tsx`).
   - Create shared reusable UI in `frontend/components/Shared/` with PascalCase component filenames.
   - Keep service/data logic in `frontend/services/`; do not mix API code into visual components.
2. Use existing design tokens as single source of truth.
   - Import from `frontend/app/theme.ts` and reuse `theme.colors`, `theme.spacing`, `theme.borderRadius`, `theme.fontSize`, `theme.fontWeight`, and `theme.shadows`.
   - Do not introduce ad-hoc hardcoded colors, spacing, radius, or shadow values when an equivalent token exists.
   - Extend token sets in `theme.ts` first when a new semantic color or scale step is needed, then consume it in screens/components.
3. Preserve the established visual direction.
   - Keep the warm corporate palette centered on `theme.colors.primary` and cream-based surfaces (`background`, `surface`, `surface2`).
   - Use status colors through semantic tokens (`success`, `warning`, `error`, `info`) instead of raw hex values.
4. Standardize React Native styling approach.
   - Use `StyleSheet.create` for screen/component style blocks.
   - Prefer semantic style keys (`container`, `header`, `primaryButton`, `label`) over one-off names.
   - Keep component props focused on behavior/state while style variations are driven by tokenized variants.
5. Button implementation baseline for this codebase.
   - Ensure every new button pattern supports: default, pressed/active, disabled, loading.
   - For icon + label buttons, keep icon size/color and text style tokenized and consistent with existing screens.
   - Match border radius and paddings to existing tiers in `theme.borderRadius` and `theme.spacing`.
