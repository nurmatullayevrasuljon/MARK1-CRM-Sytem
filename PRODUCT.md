# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Retail shop owners and their counter staff in Uzbekistan. The owner (CEO role) checks revenue, profit, stock value, overdue debt and staff activity, usually on a phone between other tasks. The seller uses the point-of-sale screen dozens of times a day, on a desktop at the counter or on a phone when the counter is busy.

## Product Purpose

MARK1 CRM runs the commercial core of a small retail business in one place: point of sale, product and stock management, sales history, customer debt with partial payments, staff roles, and daily/monthly reporting. Success means a sale is recorded in seconds, stock and debt stay correct, and the owner can see the state of the business without asking anyone.

## Positioning

One Uzbek-language workspace that connects the sale at the counter to stock, debt and reporting in the same transaction, with role-scoped access and a store-scoped dataset. It is not a generic project-management CRM and does not claim integrations or channels the product does not ship.

## Operating Context

Used at a shop counter and on a phone, often in poor or mixed lighting and on modest hardware. Prices are in so'm, quantities may be fractional. Debt is a normal part of trade: partial payment, due dates, SMS reminders. Staff sign in with a phone number; the owner manages products and users.

## Capabilities and Constraints

Confirmed in the repository: phone/password auth, JWT sessions, products and categories, sales with cash/card/debt payment, debt records and payments, clients, statistics (daily/weekly/monthly), role-based permissions, store settings, product/transaction export, SMS reminder flow, an owner-only AI daily summary card, and an Android wrapper.

Constraints: the existing Express/MongoDB API and its business rules are the source of truth; the redesign must not change pricing math, stock rules, permissions, auth, or the payment-id index. No backend or migration is added for visual work. The marketing pricing tiers, trial terms and support promises exist in current copy and are treated as business copy, not redesigned or re-invented. No customer logos, testimonials, benchmarks or third-party integrations are evidenced, so none may be fabricated.

## Brand Commitments

Name MARK1. Primary brand color `#4455EE`. Existing logo assets in `Frontend/img/`. Uzbek is the product language. Marketing and public pages are light by default; the CRM is dark by default with a fully working light theme. The user has pinned the visual direction: premium, professional, data-focused business operating system; no decorative gradients, glassmorphism, neon, blur, large shadows or ornamental animation.

## Evidence on Hand

The working product itself: `Frontend/dashboard.html`, `Frontend/js/script.js`, `Frontend/js/api-client.js`, and the API in `Backend/`. Landing copy, pricing tiers, FAQ and legal copy already exist. There are no verified customer stories, usage statistics or benchmark numbers; the dashboard preview on the landing page must stay labelled as a sample.

## Product Principles

1. The number is the interface: money, stock and debt must be legible at a glance and never ambiguous.
2. Speed at the counter outranks decoration; every extra tap in POS is a real cost.
3. Show only what the system can prove; never invent a metric, customer or capability.
4. Calm authority: the interface should feel like a tool a business trusts with its money.
5. One system across marketing, auth and app; different surfaces, same grammar.

## Accessibility & Inclusion

Target WCAG 2.2 AA across every route: contrast, visible keyboard focus, 24px minimum target size, labelled controls, reduced-motion support, and no horizontal overflow at 320px.
