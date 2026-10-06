# StayOS v2: separate sign-ups, staff apps, guest QR ecosystem, 4-step booking, room pages

## 1. Who signs up where (the core confusion, solved)

```text
Landing page "Sign in"  ->  /login        (login only, for everyone)
"Register your hotel"   ->  /signup/manager  -> 3-step onboarding -> Manager dashboard
Staff invite link/code  ->  /signup/staff    -> picks nothing; role comes from invite
Guest scans room QR     ->  /stay/<room>     -> Google sign-in -> Guest app
```

- **Manager:** signs up on their own page, finishes onboarding, and becomes manager of their branch.
- **Staff:** the manager opens My Staff and creates an invite for a department: Cleaning, Food, Front desk or Maintenance. Each invite gets a 6-character code and a link. Staff sign up with that code, and the role and branch come from the invite automatically. The manager can also create staff accounts directly.
- **Guest:** signs in with Google only, from the room QR.
- **Auto-redirect after login:**
  - Admin goes to the chain dashboard.
  - Manager goes to the branch dashboard.
  - Cleaning staff go to the Housekeeping app.
  - Food staff go to the Kitchen app.
  - Maintenance staff go to the Repair app.
  - Front desk staff go to Bookings.
- **Select hotel** appears only for the admin. Managers and staff see only their own branch name.

## 2. Manager app pages (every option in the OYO reference)
Sidebar order:
- Dashboard
- Bookings
- Rooms
- Calendar
- Pricing
- Promotions
- Food Orders
- Repair
- Supplies
- Guest Review
- Housekeeping
- Ranking
- My Staff
- Reports
- Bills
- Scan Room
- Hotel Settings

What each page does:
- **Dashboard:** keep Today's Status, Price, Promotion banner, Occupancy, Booking mix, Guest Exp, Rank and Improvement areas, plus Fast check-in. The right column gets "Staff on duty" and "Rooms to clean next".
- **Calendar:** a grid of rooms by date showing every stay.
- **Pricing:** edit the price per room type or per room, with single, double and triple occupancy rates.
- **Promotions:** branch discounts. The admin creates chain-wide offer codes.
- **Food Orders:** a live board of orders from guests (New, Preparing, Delivered). Delivered orders are added to the bill.
- **Repair:** all room condition reports, by category and severity.
- **Supplies:** a simple stock list with low-stock warnings.
- **Guest Review:** ratings guests leave after checkout.
- **Ranking:** occupancy, average room rate and guest score compared with other branches. Admins see all branches.
- **Reports:** revenue, GST collected, occupancy and staff work, with CSV download.

## 3. 4-step booking
1. **Guest:** look up the guest by mobile or Aadhaar, or add a new one. The main booker's details are mandatory.
2. **Room and dates:** room chips, check-in and check-out dates, and the night count.
3. **Occupants:** add every person staying, with name, Aadhaar, age and gender for each. Person 1 is the booker and is required. The number of people can't exceed what the room type allows.
4. **Payment:** apply an offer code (it's checked live). The page shows the full breakdown: room charges, discount, CGST, SGST and the grand total. You choose Cash, UPI (with a QR code) or Card, then confirm. The booking and a paid or pending bill are created.

## 4. Rooms
- **Rooms page:**
  - Room cards with colour-coded status: available, occupied, cleaning or maintenance.
  - Occupied rooms show the guest's name and check-out date.
  - Each card shows an issue badge.
  - Filter chips, plus a grid or list view.
- **Room page** (click a card, at /app/rooms/<number>):
  - The current guest and all occupants.
  - Stay history.
  - The cleaning log and daily condition checks.
  - Open issues.
  - Food orders.
  - Price edit (owner only).
  - Status buttons.
  - The barcode and guest QR code.
- **Print and save:** download or print the barcode and QR code for one room, or for all rooms as a printable sheet.

## 5. Housekeeping automation (cleaning algorithm)
- Cleaning tasks are created automatically:
  - On every check-out, with high priority.
  - Every day at 10:00 for occupied rooms (a daily refresh).
  - When a guest asks for cleaning.
  - When a daily check finds a Cleanliness issue.
- **Priority score:** arrival due today gets +50, check-out room +40, guest request +30, and waiting time adds 1 point per 10 minutes. The Housekeeping app sorts tasks by this score.
- **Daily condition check:** staff must tick AC, Wi-Fi, washroom, TV and cleanliness for each room once a day. Any room not checked by 18:00 alerts the manager.
- Alerts reach the bell and the cleaning app live. A task left untouched for more than 2 hours is escalated to the manager.

## 6. Staff apps (phone-first, app-style bottom tabs)
- **Housekeeping app:** My tasks (start and done), Daily checks, Scan room.
- **Kitchen app:** live order queue, mark Preparing or Delivered, and menu availability.
- **Repair app:** open issues, mark resolved, Scan room.

## 7. Guest ecosystem (separate mini-app at /stay)
- Each room gets a permanent QR code. Staff scanning it see staff actions; guests see the guest app.
- After signing in with Google, a guest is linked to the room only while they hold an active booking that matches their mobile. Otherwise they see "Ask the front desk to link your stay", and the front desk can link them with one tap.
- **Guest app:**
  - Request cleaning or towels.
  - Food menu with a cart; the order goes to the Kitchen app.
  - Report a problem.
  - Wi-Fi details and hotel info.
  - My bill so far.
  - A rating after checkout.

## 8. Fixes and polish
- Fix the blank-screen crash on Scan Room. The camera module will load safely, and errors will be caught.
- **Landing page:** an editorial redesign following your art-direction brief:
  - Big serif headlines.
  - Asymmetric photography.
  - A "How each role works" section (Manager, Staff, Guest).
  - Clear "Register your hotel" and "Sign in" buttons.
- **Phones:** bottom tab bar, large tap targets, cards that slide up as sheets.
- **Desktop:** sidebar layout like the OYO reference.
- Buttons get a refined style: solid primary, soft secondary, and clear active and pressed states.

## Technical details
- New tables:
  - `staff_invites` (code, hotel, department kind, expiry)
  - `booking_occupants`
  - `cleaning_tasks` (priority, status, source)
  - `room_checks` (daily)
  - `menu_items`
  - `food_orders` and `food_order_items`
  - `supplies`
  - `reviews`
  - `guest_links` (auth user to guest/booking)
  - `rooms.capacity` and occupancy price columns
- Every new table has RLS through `can_hotel` and `is_mgr`. Guest access goes through a security-definer `guest_room_context()` that checks the active booking.
- RPCs:
  - `redeem_staff_invite(code)` sets the profile's hotel and department and grants staff.
  - `create_booking(...)` runs the 4 steps atomically: it locks the room, validates the offer, inserts the occupants and creates the bill.
  - `checkout` creates a cleaning task.
- Cron: the daily task generator, the 18:00 check-reminder and escalation. These extend `run_automations()`.
- Routes:
  - `/login`, `/signup/manager`, `/signup/staff`
  - `/app/*` manager pages
  - `/app/rooms/$number`
  - `/staff/housekeeping`, `/staff/kitchen`, `/staff/repair`
  - `/stay/$token` (public page, Google sign-in inline)
- A role router after login picks the dashboard from the role and department.
- Google sign-in goes through the managed provider and is configured in the same step.
- Tests: bill math with an offer code, the cleaning priority score, and the invite code redeeming to the right role.
- The work ships in phases because it's large: (1) sign-ups, roles, scan fix and Rooms; (2) 4-step booking and payment; (3) housekeeping and staff apps; (4) guest QR app and food; (5) the remaining OYO pages and the landing page.
