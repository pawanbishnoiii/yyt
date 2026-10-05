# Light modern redesign + manager onboarding + fast check-in

## 1. New look (light, modern)
- Switch the whole app and landing page from dark neon to a light theme inspired by the uploaded dashboards: soft gray background, white rounded cards, gentle shadows.
- Keep the violet / cyan / pink accents (violet main buttons, pink highlights, cyan charts) so the clay images still match.
- Left sidebar: white with a filled violet pill for the active item (like the Pickolab reference). Top bar: search, "New Booking" button, notification bell, user menu.
- Landing page: same sections and images, redone on light backgrounds with pastel blobs behind the clay images.

## 2. Sign up + onboarding (every new user = hotel manager)
After signing up, a new user goes to an onboarding wizard before the dashboard:

- **Step 1 – Business & manager details:** hotel/business name, manager name, mobile number, address, PIN code, state (dropdown of Indian states), GSTIN, CGST % and SGST % (both 6% by default, editable), UPI ID for bill QR codes (optional).
- **Step 2 – Add hotel branch:** branch name, city, branch address, phone, plus quick room setup (room type, starting room number, how many rooms, price per night). Barcodes are generated automatically. Default departments get created (Housekeeping, Kitchen, Front Desk, Maintenance).
- **Step 3 – All set:** summary card with a clay image, then "Go to dashboard".

The first-ever account still becomes the chain **admin**. Every later sign-up becomes the **manager** of the hotel they create. Admin can still see and control everything.

GST settings move to each hotel, so every branch has its own GSTIN, state and CGST/SGST rates on its bills. Managers can edit their own hotel's GST later in a new "Hotel settings" page.

## 3. Upgraded dashboard (beyond the references)
Main column:
- **Today's status:** check-ins left, check-outs left, rooms in use, end-of-day occupancy %.
- **Room prices:** price per room type with a "Modify" link.
- **Promotion card:** active offers shown as a coloured card with the discount.
- **Occupancy:** area chart for the last 30 days.
- **Revenue split:** bars showing room revenue, food/service, and GST collected.
- **Guest mix:** new vs returning guests, plus top interests.
- **Improvement areas:** rooms currently in maintenance, and recent maintenance reports from staff scans.

Right column:
- **Fast check-in panel (main new feature):** type an Aadhaar or mobile number and a matching guest appears instantly as you type. Pick an available room from chips, choose nights, then one click "Check in". If no guest matches, a "New guest" button opens the full 3-step booking with the number already filled in.
- **Today's arrivals and departures** with a one-click "Check out & bill" button.
- **Live staff activity feed.**

## 4. Other additions
- **Hotel settings page** (manager + admin): GST, state, PIN code, UPI ID, address.
- **Search in the top bar:** finds bookings by booking ID, guest name or mobile.
- **Notification bell:** shows live events (new check-in, room cleaned, food delivered).
- Bills show the hotel's own GSTIN, state, and CGST/SGST rates.

## Technical details
- Migration adds `gst_number, state, pincode, cgst_rate, sgst_rate, upi_id, owner_id` to `hotels`, and `mobile, onboarded` to `profiles`.
- New security-definer RPCs, each with an `auth.uid()` check: `complete_onboarding(...)` creates the hotel, departments and rooms, assigns the manager role, and links the profile; `quick_checkin(guest_id, room_id, nights)`.
- Grants are tightened. Signup trigger: the first user gets admin; everyone else gets nothing until onboarding grants the manager role.
- `checkout.ts` reads tax rates from the hotel, falling back to `business_settings`.
- `/onboarding` lives under `_authenticated`. The app layout redirects there when `profile.onboarded` is false and the user isn't admin.
- Tokens are rewritten in `src/styles.css` as a light oklch palette, and all pages are updated to use them.
