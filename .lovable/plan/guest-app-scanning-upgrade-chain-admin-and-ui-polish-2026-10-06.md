# Guest app, scanning upgrade, chain admin and UI polish

## 1. New real photos
- Generate 6–8 realistic hotel photos: lobby, deluxe room, suite, restaurant dish, rooftop, spa, reception desk, and a staff member at work.
- Use them on the landing page, the guest app, room cards and empty states. Keep the clay illustrations for cards and feature tiles.

## 2. Separate guest app (`/stay`)
- **Explore without login:** hotel photos, room types and prices, amenities, the food menu with veg tags, active offers, Wi-Fi details (only after scanning the room QR), and a map/contact card.
- **Login only when acting:** sign-in pops up (email or Google) as a sheet when the guest places a food order, makes a service request, reports an issue, writes a review or views their bill. After sign-in the action finishes on its own.
- **Signed-in guest dashboard:** current stay card (room, nights, check-out time), live order tracker (placed, preparing, delivered), request history, bill with UPI QR, past stays across all branches, and a review prompt.
- Mobile-first layout with a bottom tab bar: Explore, Menu, Requests, My Stay, Profile.

## 3. QR and barcode scanning upgrade
- One shared scanner that reads both QR codes and barcodes, with a torch toggle, camera switch, manual code entry and a vibration on success.
- **Room QR (guest):** opens the guest app for that room.
- **Room barcode (staff):** opens a room action sheet for the staff member's role:
  - Cleaning: start and finish, plus a daily checklist.
  - Food: deliver an order.
  - Maintenance: report or resolve an issue.
  - Supplies: log what was used.
- **Booking QR on the bill and check-in slip:** a manager scans it to open the booking straight away.
- Fixes the current blank Scan page.

## 4. Upgrades for every role
- **Admin (chain owner):**
  - A Chain page listing all hotels with occupancy, revenue and rating.
  - Add, edit or suspend a hotel, and assign or replace its manager.
  - Business profile (brand, GSTIN, tax defaults), chain-wide offers, check-in form fields, backups, and a chain-wide guest lookup with full visit history.
- **Manager:**
  - Staff invites by role.
  - Food menu management.
  - A live guest orders board.
  - A reviews inbox.
  - Room detail pages with printable QR and barcode labels (single or bulk).
- **Staff:** a simple mobile home with "My tasks" (cleaning queue, food orders, open issues) and a big Scan button.

## 5. UI and experience polish
- Refined light theme with a consistent card style, better spacing and type, loading placeholders on every page, friendly empty states with illustrations, toast feedback and a ⌘K search.
- Smooth page transitions and animated counters. The layout works on phones for the guest and staff apps.

## Technical details
- Guest routes go under the public `src/routes/stay.*`, with a sign-in sheet that uses the existing `guest_*` RPCs and `guest_links`. No new auth gate is needed.
- A new `/app/chain` admin route, using `has_role(admin)`. A migration adds `hotels.status`, and adds an admin RPC `assign_manager(hotel, email)` (if a user with that email exists).
- The scanner uses `html5-qrcode` or `@zxing/browser` in a client-only lazy component. Codes are parsed by prefix: room QR token, room barcode, booking code.
- Food/request realtime uses Supabase channels on `food_orders`, `service_logs` and `cleaning_tasks`.
- Images are generated into `src/assets/photo-*.jpg`.
