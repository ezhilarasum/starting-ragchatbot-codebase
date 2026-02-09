# Frontend Changes: Dark Mode / Light Mode Toggle

## Overview
Added a theme toggle button that lets users switch between dark mode (default) and light mode. The preference persists via `localStorage` and respects the system `prefers-color-scheme` when no explicit choice has been made.

## Files Modified

### `frontend/style.css`
1. **Extracted hardcoded colors into CSS custom properties** in `:root`:
   - `--sources-hover-bg`, `--sources-hover-text` (sources summary hover)
   - `--source-item-hover-border`, `--source-item-hover-bg` (source item hover)
   - `--lesson-icon-gradient`, `--course-icon-gradient` (icon gradients)
   - `--code-bg` (inline code and pre blocks)
   - `--welcome-shadow` (welcome message box-shadow)
   - `--primary-glow` (button hover glow)
   - `--primary-badge-bg` (lesson count badge)
   - `--error-bg`, `--error-text`, `--error-border` (error messages)
   - `--success-bg`, `--success-text`, `--success-border` (success messages)
   - `--course-card-hover-border`, `--course-card-hover-bg` (course card hover)

2. **Added `[data-theme="light"]` block** with a full light palette based on Tailwind's slate scale.

3. **Added theme transition rules** (`background-color`, `color`, `border-color` at 0.3s) to key elements for smooth switching.

4. **Added toggle button styles**:
   - `.sidebar-top-row` flex container wrapping New Chat + toggle
   - `.theme-toggle-btn` — 44px circular button
   - Icon swap logic: sun icon shown in dark mode, moon icon shown in light mode

### `frontend/index.html`
1. **Added inline FOUC-prevention script** in `<head>` that reads `localStorage` and sets `data-theme="light"` on `<html>` before CSS paints.
2. **Added theme toggle button** next to the New Chat button, wrapped in `.sidebar-top-row`.
3. **Bumped cache-bust versions** from `v=11` to `v=12` on CSS and JS references.

### `frontend/script.js`
1. **Added `ThemeManager` object** at the top of the file (runs before `DOMContentLoaded`):
   - `init()` — reads `localStorage`, falls back to `prefers-color-scheme`, defaults to dark
   - `apply(theme)` — sets or removes `data-theme` attribute on `<html>`
   - `toggle()` — flips theme and persists to `localStorage`
   - Listens for system preference changes when no explicit user choice exists
2. **Added click listener** for `#themeToggleBtn` in `setupEventListeners()`.

## Verification Checklist
- [ ] Dark mode (default) looks identical to the previous version
- [ ] Clicking toggle smoothly transitions to light mode
- [ ] Refreshing the page preserves the theme preference
- [ ] Clearing localStorage + system light preference loads light mode
- [ ] Toggle accessible at 768px mobile breakpoint
- [ ] All elements render correctly: sidebar, messages, sources, code blocks, course cards
