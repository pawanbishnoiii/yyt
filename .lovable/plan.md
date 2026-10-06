# StayOS production upgrade

## Goal
Turn the current prototype into a polished, English-only hotel-chain operating system for chain admins, branch managers, department staff, and guests. Keep the interface light, fast, responsive, and close to the supplied OYO-style operational dashboards without copying their branding.

## 1. Data, permissions, and sample hotel
- Add manager permission switches controlled only by the chain admin: bookings, checkout/undo, room pricing, room status, menu, food tax, staff, reviews, reports, and hotel settings.
- Add structured menu fields and private image storage so managers can upload, replace, remove, price, categorize, and publish food items.
- Keep chain-wide guest identity while preserving branch-private visit history; expose the complete history only to admins.
- Add safe RPCs for booking creation, checkout confirmation, and one-hour checkout recovery so room status, occupants, bills, and taxes change atomically.
- Add a complete demo hotel with rooms, active menu, offers, guests, bookings, tasks, orders, reviews, and bills so `/stay` never opens as an unexplained empty product during evaluation.

## 2. One admin and chain control center
- Merge the current Chain and Admin pages into one control center with overview metrics, hotels, managers, permissions, departments, business/GST settings, offers, custom check-in fields, backups, and audit-friendly status controls.
- Replace permanent hotel deletion with suspend/reactivate for normal use; keep destructive actions guarded.
- Let admins assign or replace managers and immediately see permission coverage per branch.

## 3. Manager menu and live order operations
- Add a menu editor with photo upload, category, description, veg/non-veg, price, availability, and branch food-GST rate.
- Recreate the uploaded `OrderItemCard` interaction and visual structure using the existing Motion library and design tokens, then use it in the guest cart/menu.
- Import only food content that is legally reusable from the referenced repository; otherwise use the existing generated food assets and newly generated original food photography.
- Upgrade the live order board with room, elapsed time, notes, totals, status transitions, and realtime updates.

## 4. Four-step booking and reliable checkout
- Rebuild New Booking as four steps: primary guest lookup/details, room and stay, all occupants, payment and final tax summary.
- Support mobile/Aadhaar lookup, required primary guest, capacity-aware occupant forms, every occupant’s name/Aadhaar/age/gender, offer-code validation, payment mode, paid status, source, CGST, SGST, food/service charges, and final total.
- Create guest, occupants, booking, bill draft, and occupied room through one protected transaction.
- Keep checkout as review-first: generate the draft bill, require explicit paid/leaving confirmation, then save and open the printable bill. Preserve one-hour undo with clear recovery status.

## 5. Rooms, scanning, and role-specific staff apps
- Redesign room cards and room detail pages with current guest, stay timing, price/capacity controls, issues, cleaning schedule/history, orders, recent stays, barcode, guest QR, shareable guest link, and individual/bulk downloads.
- Make every occupied room link to its own guest landing page via QR; show the manager a copy/share/download action.
- Replace the generic staff experience with a phone-first home determined by staff department: housekeeping queue/checklist, kitchen orders, maintenance issues, or supplies usage.
- Upgrade scanning for room QR, room barcode, and booking code with camera/manual entry, role-filtered actions, useful empty/error states, and no blank screen.
- Keep room, order, cleaning, issue, and notification screens realtime with cleaned-up subscriptions.

## 6. Guest app and Google sign-in
- Redesign `/stay`, hotel, and room pages as a mobile-first guest app with an editorial hotel gallery, useful empty state, room types, amenities, offers, menu, contact/call manager, directions, requests, current stay, orders, bill, and review flow.
- Allow all browsing without an account. Ask for Google sign-in only when the guest orders, requests service, reports an issue, links a stay, views private billing, or leaves a review.
- Configure Google authentication and return guests safely to the action they started.

## 7. Visual system, speed, keyboard, and desktop tools
- Replace the purple-heavy gradient look with a restrained white/soft-gray operations UI using red, green, cyan, and amber accents inspired by the supplied references.
- Use generated real hotel and food photography plus a small, consistent set of original transparent illustrations; avoid decorative AI-style blobs.
- Standardize typography, compact cards, buttons, tabs, tables, empty states, loading skeletons, mobile bottom navigation, and desktop side navigation.
- Add keyboard command search and shortcuts for booking, rooms, scan, orders, and checkout; add a desktop fullscreen toggle with a visible exit state.
- Respect reduced motion, use lazy images, stable image dimensions, and route-level loading/error states.

## 8. Validation and release checks
- Add focused tests for tax calculations, offer codes, occupant capacity, permission enforcement, atomic booking, checkout confirmation, one-hour undo, room links, and menu/order transitions.
- Test admin, manager, housekeeping, kitchen, and guest journeys in desktop and phone viewports.
- Verify realtime updates without refresh, uploaded food images, QR/barcode routes, print layouts, all route metadata, runtime console/network errors, and the final production build.

## Technical details
- Use Lovable Cloud migrations for schema/RLS/RPC changes and Storage API for a private menu-images bucket with scoped policies.
- Roles remain in `user_roles`; manager capabilities remain server-enforced in `hotels.manager_perms` and helper functions, never trusted from the browser.
- Keep billing math centralized and move state-changing multi-table workflows into SQL RPCs with row locks.
- Use the existing `motion` package rather than adding duplicate `framer-motion`; use existing shadcn controls and semantic color tokens.
- Public guest reads stay narrowly projected through existing public RPCs; authenticated guest actions continue through security-definer RPCs tied to the signed-in user and room token.
