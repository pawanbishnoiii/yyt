# Hotel chain OS: light redesign, onboarding, fast check-in, room conditions

## What's missing today
- The sign-in form shows a raw "Invalid email" error, and it doesn't trim spaces or explain the problem in plain words.
- New sign-ups land on an "Access pending" dead end because there's no onboarding screen yet.
- The dashboard is still the old layout. There's no fast check-in, no "today's status", no pricing card, and no room conditions.
- Bills use the chain-wide GSTIN instead of each branch's own GSTIN and rates.
- There's no hotel settings page, no top-bar search, and no notification bell.
- The interface mixes Hinglish and English, and the pages still carry the old dark-theme styling.
- Nothing records room conditions (AC, Wi-Fi, washroom) or guest stay needs (quiet room, extra pillows, and so on).
- There's no demo data, and the full flow hasn't been tested end to end.

## 1. Sign-in fix and English UI
- Trim and lowercase the email, check it with a friendly message, and show clear error states.
- Every page in English only.
- A signed-in user who hasn't finished onboarding goes straight to the onboarding wizard.

## 2. 3-step onboarding wizard (every new sign-up becomes a manager)
1. **Business and GST:** hotel/brand name, manager name, mobile, address, PIN, state (dropdown), GSTIN (format checked), CGST and SGST (6% each by default), UPI ID.
2. **Add hotel branch:** branch name, city, address, phone. Room setup takes a type, a starting number, a count and a price, and you can add several room types. Barcodes and departments are created automatically.
3. **Review and launch:** a summary, then a confetti moment and on to the dashboard.

## 3. New dashboard (OYO OS-style, light)
- **Top bar:** search for bookings or guests, a green "New Booking" button, a live notification bell, and the user menu.
- **Sidebar:** white, with the active item marked by a pill.
- **Main column:**
  - Today's Status: check-ins left, check-outs left, rooms in use, end-of-day occupancy.
  - Price card per room type, with a Modify link.
  - Promotion banner showing the active offers.
  - 30-day occupancy chart.
  - Revenue mix.
  - Guest happiness.
  - **Improvement areas:** AC, Wi-Fi, washroom and similar issues, with the affected room numbers.
- **Right column:**
  - **Fast check-in:** type a mobile number or Aadhaar and the matching guest appears as you type, along with their past stays and preferences. If there's no match, an inline new-guest form opens with the number already filled in. Pick a room chip and the nights, then check in with one click.
  - Arrivals and departures, with a one-click "Check out and bill" button.
  - Live staff feed.

## 4. Guest preferences and room conditions
- Stay needs per guest (quiet room, high floor, extra pillows, vegan, late checkout, plus a free note). You can capture these at check-in and edit them on the Guests page.
- Room condition reports by category (AC, Wi-Fi, washroom, TV, plumbing, cleanliness), each with a severity, a note and a resolve button. They show up on the Rooms page, on the dashboard and on the scan page.

## 5. Settings, bills and automations
- Hotel Settings page where you can edit the GSTIN, rates, UPI ID and address.
- Each bill shows its branch's own GSTIN, state and rates, and its QR code uses the branch's UPI ID.
- Automations:
  - Nightly backup (already in place).
  - A new hourly job flags overdue check-outs.
  - Rooms that stay in "cleaning" for more than 2 hours are flagged.

## 6. Landing page and polish
- New light landing page with an OYO-style product preview, smooth scrolling (Lenis) and soft motion.
- Pages load quickly and show loading placeholders while data arrives.

## 7. Demo data and testing
- Demo data for one branch: rooms, guests, an active stay, a past bill and condition reports.
- An end-to-end test covering sign-up, onboarding, fast check-in and check-out with a bill, plus unit tests for the GST math.

## Technical details
- Migration: new `room_issues` and `guest_preferences` tables (or `guests.preferences jsonb`), with RLS that uses `can_hotel` and `is_mgr`. A new `flag_overdue()` function scheduled with pg_cron runs hourly. Realtime is enabled on the new tables.
- Demo seed: a SQL function `seed_demo(hotel)` that a manager can trigger from settings. It's limited to managers of that hotel.
- `checkout.ts` reads the rates from `hotels` and falls back to `business_settings`.
- New libraries: `lenis` (smooth scroll), `cmdk` (search), `@number-flow/react` (animated numbers).
