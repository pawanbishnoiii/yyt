# StayOS complete build: everything in the pasted list

This is a big request, so the work is done in the order below. Each block is tested before the next one starts.

## 0. Fixes and setup

- Fix the blank "Rooms" page (the "Rendered more hooks" crash) and look for the same kind of bug on every other page.
- Create the admin account [admin@admin.com](mailto:admin@admin.com) with the password you gave, and give it the admin role.
- Remove Google sign-in everywhere. Sign-in uses email and password only.

## 1. Staff ID sign-in

- The manager creates a staff member with a 4-digit Staff ID (for example 4821) and a short password. The password must be at least 6 characters, because that is the sign-in system's minimum. and ye staff id har manager apne hotel ke staff ke liye genrate karega and duplicate na ho eske liye avablity chak hogi and 
- The sign-in page gets two tabs: "Email" and "Staff ID". Staff with a Staff ID go straight to their own app.
- A Staff page for managers to create, reset and remove staff, with each person's role (room service, food, cleaning) and when they were last active.

## 2. Staff apps (live updates, no refresh needed)

- `/food` is a food order board. Orders move through **Accept → Start preparing → Ready → Out for delivery → Delivered**, one button at a time.
- `/RoomService` lists room service requests. Staff press **Accept → Start → Done** and can scan a room barcode to update that room.
- A "Call manager" button sends an alert to the manager straight away and opens the phone dialer.
- The manager sees every order and request change as it happens.

## 3. Guest app (`/stay`)

- A modern mobile app layout. "Scan & Join" opens the camera so guests can scan the room QR and join the room.
- Explore shows nearby hotels first (guessed from the visitor's location by IP address). Hotel cards show a "from" price, which is the lowest room price. Each room shows its own fixed price.
- **Food** (the old "Menu"):
  - Each dish has its own page.
  - Veg and non-veg dishes are in separate groups.
  - If a hotel has no non-veg dishes, a "100% Pure Veg" banner shows.
  - Ordering uses a new cart drawer.
- Room service requests go straight to the manager and the staff app.
- Reservations: pick a hotel, dates and a free room, then get a confirmation with a booking code.
- Animated scratch-card offers, nicer offer cards, and call buttons.

## 4. Manager, admin and Chain Control

- **Manager dashboard:** today's status (check-ins and check-outs left, rooms in use), room prices by room type, a promotion panel, live orders and requests, and reviews.
- **Settings:** switches for check-out time, ID upload and room service tasks.
- "Load demo data" disappears once it has been used.
- **Keyboard tips:** a small popup you can close. It shows up more often until you start using shortcuts, then stops. New shortcuts: N for a new booking, R for rooms, F for food, G then D for the dashboard, and ? for help.
- **Admin dashboard:** chain-wide revenue and occupancy, the best and weakest hotels, staff activity, and pending alerts.
- **Chain Control automations** (on/off switches for each hotel):
  - Overdue check-out alerts.
  - Cleaning that waits too long gets escalated.
  - Daily room refresh.
  - Low-supply alerts.
  - Food orders not accepted within 10 minutes trigger an alert.
  - A nightly backup.
  - A daily revenue summary.

## 5. Look and feel

- Generate 12 or more new photos and use them on the landing page, the guest app, empty pages and the sign-in page.
- Upgrade the icons, use cleaner cards and better spacing, and add smooth animations.
- **New landing page:** a large photo banner, separate paths for guests and hotel teams, a feature showcase with motion, and a short "how it works" section.

## 6. Testing

- Sign in as admin, as a manager and as staff (Staff ID), and open every page.
- Test the full food flow: the guest orders, staff accept, preparing, delivered, and the manager sees each step live.
- Test a room service request, a reservation, and a booking with payment.

## Technical details

- Staff ID accounts are normal sign-in accounts with a hidden email like `4821@staff.stayos.local`. A manager-only server function creates them, and the 4-digit ID is unique per chain (a `staff_code` column on profiles).
- New `food_orders` statuses: accepted, preparing, ready, out_for_delivery, delivered. Requests use `cleaning_tasks` and `room_issues` with an accept step. Live updates use the realtime feed on `food_orders`, `cleaning_tasks`, `room_issues` and `alerts`.
- A `call_manager(room, note)` database function writes an alert.
- Automations go in a per-hotel `automation_settings` setting, which the scheduled `run_automations()` job reads.
- Nearby hotels: a public lookup of the visitor's IP location, then sorting by city match.
- Admin seed: a one-time server action using the admin client. and ye sab kuch modren software ke liye banao and esme animations , trasnstion and motion , gsap , lottie animations , text trasnsetions ,  ka use kro and sab kuch aik sath build kro 