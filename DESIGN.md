---
name: MARK1 Business OS
description: Precision ledger visual design system for retail commerce and CRM
colors:
  brand: "#4455EE"
  brand-hover: "#3446D8"
  brand-press: "#2938B4"
  brand-soft: "#EDEFFE"
  brand-ink: "#2A35A2"
  canvas-light: "#F4F5F9"
  surface-light: "#FFFFFF"
  surface-2-light: "#FAFBFD"
  surface-3-light: "#EEF0F6"
  ink-light: "#0B1220"
  ink-2-light: "#414B60"
  ink-3-light: "#5A6478"
  line-light: "#E3E6EE"
  line-strong-light: "#C9CFDD"
  canvas-dark: "#0A0E17"
  surface-dark: "#101623"
  surface-2-dark: "#141C2B"
  surface-3-dark: "#1A2334"
  ink-dark: "#EDF0F8"
  ink-2-dark: "#A6B0C3"
  ink-3-dark: "#94A0B8"
  line-dark: "#1F2939"
  line-strong-dark: "#2C3950"
  success: "#0E7A50"
  success-dark: "#34D399"
  warning: "#8A5A00"
  warning-dark: "#FBBF24"
  danger: "#B3261E"
  danger-dark: "#F87171"
  info: "#1457C0"
  info-dark: "#2563EB"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "clamp(32px, 3.5vw, 48px)"
    fontWeight: 750
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  h1:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  h2:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "20px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "11px"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "0.06em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  base: "16px"
  lg: "20px"
  xl: "24px"
  2xl: "32px"
  3xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "38px"
  button-secondary:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "38px"
  card:
    backgroundColor: "{colors.surface-light}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

## Overview

MARK1 Business OS is a precision ledger visual design system built for retail shop management in Uzbekistan. The aesthetic treats software as a trusted commercial record: hairline-ruled surfaces, tabular numerals, a single brand accent (`#4455EE`), and calm, low-noise elevation. Decorative gradients, glassmorphism, neon outlines, glowing dropshadows, and unearned animations are rejected in favor of dense, legible data presentation.

## Colors

The system uses a single primary brand hue `#4455EE` across all light surfaces and `#4D5DEF` on dark backgrounds.
- **Brand**: `#4455EE` (light), `#4D5DEF` (dark), with `#EDEFFE` soft background and `#2A35A2` contrast ink on light.
- **Light Surfaces**: Paper canvas `#F4F5F9`, card surface `#FFFFFF`, secondary surface `#FAFBFD`, inset `#EEF0F6`.
- **Dark Surfaces**: Canvas `#0A0E17`, card surface `#101623`, elevated rail `#141C2B`, inset `#1A2334`.
- **Rules & Hairlines**: Light `#E3E6EE` (subtle) / `#C9CFDD` (strong); Dark `#1F2939` (subtle) / `#2C3950` (strong).
- **Semantics**: Emerald `#0E7A50` (cash, profit, positive), Amber `#8A5A00` (debt warning, pending), Red `#B3261E` (overdue, stock critical, delete), Blue `#1457C0` / `#2563EB` (card payment, info).
- Contrast: All text elements clear WCAG 2.2 AA (4.5:1 body, 3:1 large text) across all 20 tested surfaces.

## Typography

Primary typeface: **Inter** with tabular numerals lining mode for all money, stock, counters, timecodes, and tables.
- **Scale**: Display (48px), h1 (26px), h2 (20px), h3 (17px), h4 (15px), body (14px), small (12px), micro-label (11px uppercase +0.06em tracking).
- **Headings**: Tight tracking (`-0.025em` to `-0.035em`), weight 650 to 750, balanced text wrapping.
- **Numbers**: `font-variant-numeric: tabular-nums lining-nums;` strictly enforced so values never jitter between table rows or metric updates.

## Layout

1. **CRM Shell**: 2-column grid (`248px` sidebar + `minmax(0, 1fr)` content) on desktop. Sidebar collapses to `76px` icon rail via toggle. On screens below 992px, the sidebar becomes an off-canvas drawer (`transform: translateX(-102%)`) and a 6-button bottom bar takes over navigation with 50px tap targets.
2. **Topbar**: Sticky 66px header with page title, module subtitle, theme switcher (Shift+T), and profile menu.
3. **Ledger Strip**: The signature 6-metric KPI strip sits in one unified container with hairline internal dividers. Card 1 (Oylik tushum) is a dominant brand panel (`#4455EE` fill, white text); cards 2-6 sit side by side as compact metric cells.
4. **POS Layout**: Two-column split grid (Product search & cart on left; sticky checkout & payment buttons on right). On mobile, stacks with full-width 46px payment buttons.

## Elevation & Depth

No chromatic glow shadows or zero-offset colored halos. Elevation is communicated with 1px border rules and soft, offset ambient shadows:
- `--m1-shadow-1`: `0 1px 2px rgba(11, 18, 32, 0.05), 0 1px 1px rgba(11, 18, 32, 0.03)`
- `--m1-shadow-2`: `0 14px 34px -16px rgba(11, 18, 32, 0.28), 0 2px 6px rgba(11, 18, 32, 0.05)`
- `--m1-shadow-3`: `0 28px 60px -28px rgba(11, 18, 32, 0.38)` (modals and floating dropdowns)

## Shapes

- Cards and surfaces: 12px radius (`--m1-r-lg`).
- Inputs, selects, buttons: 8px radius (`--m1-r-md`).
- Badges, pills, action icons: 6px radius (`--m1-r-sm`).
- Filter pills and avatar fallbacks: 999px pill radius.

## Components

- **Buttons**: Default min-height 38px (large 46px, small 32px), 8px radius, font 13.5px / weight 600, active click transform `translateY(1px)`. Primary is solid brand blue; secondary is bordered neutral; disabled states use subdued background with `cursor: not-allowed`.
- **Form Controls**: 42px min-height, 1px border, 8px radius, visible focus ring (`0 0 0 3px rgba(68, 85, 238, 0.32)`). Select controls have dedicated SVGs positioned right with `no-repeat`.
- **Tables**: `thead th` styled with 11px uppercase tracked typography on `surface-2` background. Numeric cells right-aligned or tabular-spaced. Rows highlight subtly on hover with `surface-2`.
- **Debtors Action Cluster**: The 7 action buttons are organized into a 2-row grid of compact 30px bordered squares with contextual hover colors (call: blue, SMS: indigo, add debt: green, reduce debt: amber, edit: amber, delete: red).

## Do's and Don'ts

- **DO** use tabular numerals (`font-variant-numeric: tabular-nums lining-nums`) for any element displaying currency, quantities, or timestamps.
- **DO** use 1px hairline rules (`var(--m1-line)`) to separate sections and containers instead of heavy colored borders.
- **DO** maintain 4.5:1 contrast for all functional and body text.
- **DON'T** introduce purple/violet gradient backgrounds, neon box-shadow glows, or glassmorphism blurs.
- **DON'T** use multi-colored side-tab borders on cards (`border-left: 3px`).
- **DON'T** invent unverified third-party customer logos, statistics, or integration claims.
