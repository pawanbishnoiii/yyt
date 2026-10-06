# StayOS — full upgrade plan

Everything you asked for, grouped into 6 phases. I build them in order in one run; each phase is checked before moving on.

## Phase 1 — New look (inspired by the RestoDash reference)
- New sidebar: compact white panel, soft pill highlight for the active page, grouped sections (Front desk, Food, Hotel, Chain), small icons, collapsible to icons-only, hotel switcher + user card at the bottom, "Upgrade/help" style tip card.
- Top bar: search with Ctrl+K, date/time, live dot, notifications, profile, full-screen button.
- Dashboard: 4 stat cards on top (today's revenue, check-ins, occupancy, dues) with up/down trend vs yesterday, then the existing panels restyled with softer cards, better spacing, and new fonts (no default look).
- Phone view: bottom tab bar, app-style layout.

## Phase 2 — New Booking (5 steps, keyboard driven)
1. Lead guest — search by mobile or Aadhaar; a found guest shows as a card with an Edit button. Guest details save automatically once you reach step 2, even if the booking isn't finished.
2. Room — pick an available room.
3. Stay — calendar with live date/time, nights, check-out time (default 11 AM, set per hotel by admin, can be turned off).
4. Guests — total guests, each guest's details, booking source, ID upload (file or camera), which admin can turn on/off.
5. Payment — method, partial payment, balance. Bill print only shows once payment succeeds.
- Enter moves to the next step on desktop in every step.

## Phase 3 — Bills, rooms, staff
- Bill payment tracking: record several payments (cash/UPI/card), partial amounts, balance due, paid status.
- Room page `/app/room/<room number>`: print bill button when room is occupied.
- Staff page: manager creates staff login ID + password, sees last seen and average opens per day.
- Staff apps: `/RoomService` (cleaning + delivers food, towels, soap, water; manager picks tasks and can add extras) and `/food` (kitchen). Each has a "Call manager" button that opens the phone dialer.
- "Load demo data" button shows only once, then disappears.

## Phase 4 — Menu Studio + food photos
- Copy all food images from the bnoy GitHub folder into storage and add those food items with names and prices as demo menu.
- Menu Studio: POS-style grid like the reference (category tabs, search, item cards with photo, price, + button), bulk edit, availability toggle, food tax setting.

## Phase 5 — Guest app (/stay) + online reservations
- Without QR: pick city then hotel, browse rooms, prices, services.
- Reservation flow: choose hotel, dates, available room, guest details, receive a booking confirmation with code.
- With QR + Google sign-in: guest joins the room automatically; sees Wi-Fi name/password, call manager / room service buttons, food ordering from Menu Studio, offers.
- Offers: coupon codes, scratch-card animation, 10% off for new users (food + rooms), 20% off for couples.
- Room services stop working after check-out. Room condition updates live.

## Phase 6 — Landing page
- New creative home page: big photo-led opening, live "rooms available" ticker, features for each role (admin, manager, staff, guest), app-style phone mockups, generated photography, smooth motion.

## Technical details
- Database: `bill_payments` table (amount, method, note) with balance computed from bill total; `hotels` gets `checkout_time`, `checkout_time_enabled`, `id_upload_enabled`; `guests` gets `id_doc_path`; `bookings` gets `check_out_planned`; `profiles` gets `last_seen_at`, plus `staff_sessions` for open counts; `room_service_items` per hotel for manager-selected tasks; `reservations` path reuses `bookings` with status `reserved` via a `guest_reserve()` RPC that locks the room for the date range; `offer_claims` for one-time new-user offer; `hotels.demo_loaded` flag.
- Private `guest-ids` storage bucket with hotel-folder access rules; food photos go into existing `menu-images` bucket.
- Staff accounts are created through the existing admin server function with a manager-permission check.
- Live updates via realtime on bookings, rooms, orders, cleaning tasks.
- Routes: `/app/room/$number`, `/RoomService`, `/food`, `/stay/reserve/$hotelId`.

## What to know
- This is very large; expect it to take several long build steps. Prices from the GitHub repo will be used as-is (in ₹).
- Couple 20% offer: I'll treat "couple" as a booking with exactly 2 adults — tell me if you meant something else.
