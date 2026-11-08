# Qfast: Product and Engineering Specification v2

Version 2.0. This revision merges the original spec with Google review prompts, customer profiles, loyalty, offers, sponsored placements and a two-plan pricing model.

## What changed in v2

- **Pricing:** the single-subscription rule is replaced by two plans, Essential and Advanced, driven by a data-driven entitlement system.
- **Advanced plan** gets online payments, loyalty, offers and campaigns, WhatsApp, sponsored placements, third-party integrations, multi-branch and advanced analytics.
- **New modules:** Reviews and Feedback, Customer Profiles, Loyalty, Offers and Campaigns, Sponsored Placements.
- **New compliance rules:** Google review policy, separate marketing consent, ad labelling.
- **New Prisma models, a new build phase and a list of open decisions** at the end.
- Anything not mentioned here is unchanged from v1.

## 1. Project Overview

Build Qfast, a production-ready, multi-tenant SaaS platform for restaurants, cafés, QSRs and food outlets, and later clinics and other appointment-based businesses. It digitizes the customer experience with QR queues, reservations, digital menus, table and takeaway ordering, kitchen management, notifications, reviews, loyalty and analytics.

Principles:

1. Extremely easy for non-technical owners: guided setup and sensible defaults.
2. The Essential plan is a complete, working restaurant product, never a crippled demo.
3. The Advanced plan adds revenue and growth tools instead of removing basics.
4. Customers never install an app and need the fewest possible steps.
5. Consent comes first for every message, profile and ad.

## 2. Plans and Entitlements

### 2.1 Plan comparison

Defaults below. Plan contents live in the database, so product can move a feature between plans without a code release.

| Capability | Essential | Advanced |
| --- | --- | --- |
| Entrance QR, live queue, reservations | Yes | Yes |
| Table QR dine-in ordering | Yes | Yes |
| Takeaway link and ordering | Yes (pay at counter or pay later) | Yes (adds online payment) |
| Digital menu, variants, add-ons, scheduling | Yes | Yes |
| Kitchen Display System | Yes | Yes |
| Table management, QR manager | Yes | Yes |
| Staff roles and audit log | Yes (staff limit) | Unlimited staff |
| Branches | 1 | Multiple, with branch switching |
| Web push and SMS (SMS billed from credits) | Yes | Yes |
| GST-compliant invoices | Yes | Yes |
| Google review prompt and private feedback inbox | Yes | Yes |
| Basic analytics (daily sales, orders, peak hours) | Yes | Yes |
| **Online payments** via Razorpay, refunds, reconciliation | No | Yes |
| **WhatsApp Business updates** (messages billed from credits) | No | Yes |
| **Loyalty programs** | No | Yes |
| **Offers, coupons and win-back campaigns** | No | Yes |
| **Sponsored in-app placements** (opt-in, revenue share) | No | Yes |
| Customer profiles with visit history and favorites | Basic (name, visits) | Full |
| Feedback analytics and recovery workflows | No | Yes |
| Advanced analytics and PDF/CSV exports | No | Yes |
| Split bill, tips, no-show deposits | No | Yes |
| Multilingual menus | 1 extra language | Unlimited |
| Swiggy, Zomato, POS and other integrations | No | Yes |
| API access and outgoing webhooks | No | Yes |
| Priority support | No | Yes |

### 2.2 Rules

- Essential must run a restaurant end to end: queue, table ordering, takeaway, kitchen, staff and basic reports.
- Usage-based costs are never hidden in the plan price. SMS and WhatsApp messages draw from prepaid message credits that the owner tops up.
- Qfast subscription billing is completely separate from the restaurant's customer payments.
- Qfast takes no commission on customer payments unless a platform fee is explicitly configured through an approved marketplace or linked-merchant arrangement.

### 2.3 Entitlement system

- Every gated feature has a feature key, for example `payments.online` or `loyalty.program`.
- A `Plan` has many `PlanFeature` rows (key, enabled, limit).
- A business's active `Subscription` resolves to an entitlement set, cached per tenant.
- Backend guards (`@RequiresFeature('loyalty.program')`) enforce entitlements on every API route and socket event. The frontend only hides or shows UI and is never the source of truth.
- Locked features show a short upgrade prompt that explains the benefit, never a dead end.
- Super admin can grant per-business overrides (trials, custom deals, grace periods).

### 2.4 Upgrade, downgrade and lapse behavior

- Upgrades take effect immediately, with pro-rated billing.
- Downgrades take effect at period end. Data is never deleted. Advanced-only data becomes read-only.
- On downgrade, in-flight online payments, pending refunds and outstanding loyalty balances must still be settled. Customers keep access to their loyalty wallet for a defined grace period (default 90 days).
- Lapsed payment moves a business to a 7-day grace period, then to read-only mode. Queue and ordering links show a polite fallback instead of an error.

## 3. Technology Stack

- **Frontend:** Next.js with TypeScript, Tailwind CSS and shadcn/ui.
- **Backend:** NestJS with TypeScript, modular monolith. No microservices, Kafka or Kubernetes.
- **Database:** PostgreSQL with Prisma.
- **Real time:** Socket.IO.
- **Auth:** secure JWT access tokens with rotating refresh tokens.
- **Payments:** Razorpay, using an approved marketplace or linked-merchant arrangement.
- **Notifications:** Web Push, WhatsApp Business Platform, SMS gateway.
- **Background jobs:** a queue-backed job runner (for example BullMQ with Redis) for reminders, review prompts, campaigns and reconciliation.
- **Storage:** cloud object storage.
- **Deployment:** Vercel for the frontend and a suitable cloud host for the backend.

## 4. Three QR Experiences

### 4.A Entrance QR: queue, reservations, preorder

Each business or branch gets a unique entrance QR. On scan, the customer can:

- View restaurant details and live queue status.
- Join the queue with name, mobile number and party size.
- Receive a unique token, current position and estimated wait.
- Track queue movement in real time and cancel the entry.
- Receive alerts when their turn approaches and when the table is ready.

Reservations:

- Pick date, time and number of guests, and see available slots.
- Submit a request and receive confirmation (automatic or on approval).
- Cancel or modify according to restaurant policy.
- Receive reminders. Advanced plan businesses can require a refundable no-show deposit.

Preordering:

- Browse the menu, customize items and build a preorder.
- Link the preorder to a reservation or queue token.
- Pay online (Advanced) or choose a restaurant-supported option.

New in v2 (Advanced): a recognized returning customer (consented, OTP-verified phone) sees a welcome-back card with their loyalty balance and any eligible offer.

### 4.B Table QR: dine-in ordering

Every table has a unique QR. On scan the app identifies the restaurant and table and shows:

- The digital menu with categories, descriptions, prices, photos, veg/non-veg indicators and live availability.
- Customization, add-ons, cart management and special instructions.
- Support for several customers at the same table adding orders, all linked to that table.
- Pay online (Advanced), pay at counter or pay later.
- Order confirmation and live preparation status.
- Buttons to call for assistance and request the bill.
- Tip and split-bill options (Advanced).

### 4.C Remote takeaway QR and shareable ordering link

Every business gets a public ordering URL. Customers can:

- Browse the menu, choose takeaway, build a cart and customize items.
- Choose a pickup time where supported and enter contact details.
- Pay online (Advanced) or pay at pickup (Essential).
- Receive confirmation, track preparation and get a pickup-ready notification.

### 4.D After the visit

When an order is completed or a token is seated, the customer enters the post-visit flow: loyalty points credited (Advanced), then a review and feedback prompt (Section 6).

All three experiences work in a mobile browser with no app install. QR codes redirect through permanent short URLs, so printed codes survive menu changes.

## 5. Restaurant Dashboard

**Overview:** today's sales, total, active, pending and completed orders, queue length, average wait, occupied and available tables, reservation count, takeaway orders, revenue trends, new feedback and (Advanced) loyalty activity.

**Live order management:**

- Orders arrive from table QR, takeaway, reservation preorders, queue preorders and approved integrations.
- Each order shows ID, source, customer, table or pickup details, items, quantities, customizations, instructions, total, payment status, preparation status and timestamp.
- Staff can accept, reject where appropriate, prepare, mark ready and complete.
- Duplicate processing is prevented with idempotency keys and unique external order identifiers.

**Kitchen Display System:** live incoming orders, preparation timers, item-level status, priority and delayed-order alerts, ready and completed lists, filters by table, takeaway and source. It stays in sync with the customer tracking page and the dashboard.

**Queue management:** live token generation and numbering, party-size tracking, priority and reservation handling, manual tokens, permission-checked reordering, estimated wait, mark arrived, call next, skip or cancel, restore skipped tokens, history, analytics, multiple counters and configurable queue rules.

**Table management:** create and edit tables, capacity, occupied/reserved/available states, assign orders, merge tables, transfer orders and generate table QR codes.

**Digital menu management:** categories, items, images, prices, descriptions, variants, add-ons, availability and temporary unavailability, preparation times, taxes and charges, scheduled availability and multiple menus. Optional stock counts can mark items sold out automatically.

**Reservation management:** calendar view, slots and capacity, approval or automatic confirmation, cancellations, reminders, walk-in conversion and linked preorders.

**QR code manager:** generates entrance, table and takeaway QR codes and the public ordering URL. Supports PNG and PDF download, bulk export, printable table templates, custom branding, activation and deactivation, and permanent redirect URLs.

**Growth hub (Advanced):** feedback inbox, loyalty program setup, offers and campaigns, sponsored placement settings and message-credit balance, all in one section so owners find them easily.

## 6. Reviews and Feedback

### 6.1 Google review prompt

- The owner enters their Google Place ID, which Qfast verifies with a lookup, and the system builds the official Google review link.
- Trigger: order completed or token seated, plus a configurable delay (default 30 to 90 minutes).
- Frequency: at most once per visit, with a cooldown per customer (default 30 days).
- Only consented customers are contacted. Channel order: web push, then WhatsApp (Advanced), then SMS.
- The landing page shows two equal choices: **Rate us on Google** and **Send private feedback**. Both are shown to every customer.

### 6.2 Google policy guardrails (hard rules)

- **No review gating.** Never route only happy customers to Google. The Google link is shown regardless of rating.
- **No incentives.** No points, discounts or freebies in exchange for a review, and no loyalty rule may reference reviews.
- **No staff-operated kiosks.** Prompts go only to the customer's own device.
- Re-verify Google's current policy before launch and on each major release.

### 6.3 Private feedback

- One-tap 1 to 5 rating, tags (food, service, wait, cleanliness, value), optional item-level ratings, free-text comment and an optional request to be contacted.
- Inbox statuses: new, acknowledged, resolved. Managers can assign, reply through consented channels and add internal notes.
- Recovery workflow (Advanced): low private ratings alert a manager instantly. This never changes whether the Google link is offered.
- Analytics (Advanced): rating trends, issues by item, shift, table and order source, and response time.

## 7. Customer Profiles and Consent

- **Profile:** phone number (OTP-verified), name, optional email, optional birthday and anniversary, visit history, favorite items, usual party size, dietary preference and staff notes. No sensitive categories such as health or religion.
- **Staff view:** a regulars badge on tokens and table orders, with visit count and favorites.
- **Consent ledger** (`CustomerConsent`) records each purpose separately: service updates, marketing messages, loyalty profile and personalized offers or sponsored content. Each entry stores timestamp, channel, source, notice version and revocation.
- **Opt-out:** one-tap unsubscribe and STOP keyword handling, honored immediately across all channels.
- **DPDP Act readiness:** clear notice, purpose limitation, data export and erasure requests, retention schedules, and a record of processing. Final legal review by counsel before launch.
- Customers can view and manage their data and consents from a lightweight web page, with no account password (OTP login).

## 8. Loyalty Program (Advanced)

### 8.1 Program types

- Points per rupee spent, with configurable earn rates.
- Visit-based stamps (for example, every 8th visit earns a reward).
- Optional tiers (for example Silver and Gold) based on spend or visits.
- Birthday and anniversary rewards, and optional referral rewards.

### 8.2 Earning and redeeming

- Points are earned only on paid, completed orders and are reversed automatically on refunds.
- Earn rules can vary by branch, order source, time window and item category.
- Redemption works at online checkout and at the counter, where staff look up the customer by OTP or QR.
- Rewards catalog: discount, free item, or cashback-style credit. Points have configurable expiry with advance reminders.
- Multi-branch businesses choose shared or per-branch balances.

### 8.3 Customer experience

- A no-install loyalty wallet page shows balance, tier progress, rewards and history.
- Welcome-back card on the entrance QR, with an automatic offer when eligible.
- Earned-points confirmation appears after payment.

### 8.4 Fraud and integrity controls

- One account per verified phone number, with OTP at enrollment and at redemption.
- Daily earn caps and velocity checks per customer and per device.
- An immutable `LoyaltyTransaction` ledger. Balances are derived from it, and manual adjustments need a reason and are audit-logged.
- A points-liability report shows outstanding value so owners understand their obligation.
- Loyalty requires a marketing-or-loyalty consent entry before any promotional message is sent.

## 9. Offers, Coupons and Campaigns (Advanced)

### 9.1 Offer types

- Percentage or flat discount, minimum-spend offers, free item, buy-one-get-one and combos.
- First-order discount, happy-hour or time-window offers, and day-of-week offers.
- Tier-exclusive and channel-exclusive offers (for example, takeaway only).
- Coupon codes with global and per-customer usage limits, validity dates, and branch and order-source eligibility.
- Stacking rules: a clear default of one offer per order, with owner-configurable exceptions.
- Funding source on every offer: restaurant-funded or sponsor-funded (Section 10), so settlement is tracked.

### 9.2 Redemption integrity

- All discounts are calculated and validated on the backend by one pricing engine. The frontend never sends a final price.
- Redemption is idempotent and recorded in `CouponRedemption`. Refunds reverse or restore redemptions according to policy.
- Taxes and charges are recalculated correctly after discounts.

### 9.3 Campaigns

- **Segments:** new customers, repeat customers, lapsed 30, 60 or 90 days, birthday or anniversary coming up, high spenders, loyalty tier.
- **Channels:** web push, WhatsApp approved templates, SMS (credits required).
- **Consent filter:** only customers with valid marketing consent for that channel are ever included.
- **Controls:** schedule, quiet hours (default 9 PM to 9 AM), per-customer frequency cap (default 2 per week), send-rate throttling.
- **Cost preview:** estimated credit cost is shown before the owner confirms a send.
- **Results:** delivered, clicked, redeemed and attributed revenue per campaign.
- **Automated journeys:** welcome-back on scan, win-back after a lapse, post-visit thank-you, birthday reward. Each can be toggled on or off with one switch.

## 10. Sponsored In-App Placements (Advanced)

This section assumes sponsored placements means brands or local advertisers paying for visibility inside the customer experience, with a revenue share for the restaurant. Confirm this in the open decisions list.

### 10.1 How it works

- Qfast sells and manages sponsor campaigns from the super admin dashboard. Restaurants on the Advanced plan opt in.
- Qfast and the restaurant share revenue at a configurable rate. A ledger and monthly payout statement make the split transparent.
- Sponsors can also fund offers (for example, a free drink with a combo), tracked as sponsor-funded redemptions.

### 10.2 Placement slots

- Queue waiting page, order tracking page, post-visit page and a single menu banner.
- Restaurants can switch each slot on or off.

### 10.3 Restaurant controls

- Opt in or out at any time, and approve or reject individual sponsors.
- Category blocklist. Alcohol, tobacco, gambling and other age-restricted or sensitive categories are blocked by default.
- Competitor exclusion, for example no rival restaurant brand.

### 10.4 Hard rules

- Every placement is clearly labelled Sponsored and never imitates organic content such as menu items or system messages.
- Sponsored content never blocks or interrupts core actions: joining a queue, ordering, paying or tracking.
- No personal data is ever shared with sponsors. Sponsors receive aggregated impressions, clicks and redemptions only.
- Personalized targeting requires the customer's personalized-offers consent. Without it, placements are contextual only (by time and slot).
- Frequency caps per customer, lazy loading and a strict performance budget so pages stay fast.
- Disabled by default for clinics and any health-related vertical.
- Content moderation and an advertising-code review (for example ASCI guidelines in India) before any creative goes live.

## 11. Customer Notification System

A centralized notification engine handles every channel, message category and delivery log.

### 11.1 Message categories

- **Transactional:** token, queue position, table ready, order status, reservation confirmations and reminders. Requires only service consent given at join or order time.
- **Marketing:** offers, campaigns, loyalty promotions. Requires separate marketing consent and always includes an opt-out.
- **Feedback:** the post-visit review prompt, treated as a service message with a cooldown.

### 11.2 Channels

- **Web push:** request permission at a sensible moment, and degrade gracefully on browsers that do not support it (notably some iOS configurations).
- **WhatsApp Business Platform (Advanced):** the customer starts the conversation through a prefilled link, the number is verified and linked to the token or order, and consent and delivery status are recorded. Free-form messages are sent only inside the customer-service window. Approved templates are used outside it. Never assume customer initiation makes every future message free. Marketing and utility templates are billed per message from credits.
- **SMS:** token confirmation, position updates, reminders, order confirmation and pickup-ready alerts. In India this requires DLT-registered sender IDs and templates.
- **Email:** receipts and invoices, where an address was supplied.
- **Live tracking:** Socket.IO updates customer pages in real time. Notifications are a backup, not a replacement.

### 11.3 Cost control

- Prepaid message credits per business, with a ledger, low-balance alerts and auto top-up as an option.
- Channel fallback rules are configurable (for example, push first, then WhatsApp, then SMS only for time-critical alerts).
- Customers manage notification preferences from a no-login preferences page.

## 12. Payment Management

### 12.1 Essential plan

- Pay at counter and pay later. Staff mark an order as paid and choose the method (cash, card at counter, UPI shown by the restaurant).
- These are recorded in `Payment` for reporting and invoices, but Qfast does not process the money.

### 12.2 Advanced plan

- Online payment through Razorpay, plus pay at counter and pay later.
- Restaurant-configured payment options per branch and per order source.
- Payment confirmation, refunds and partial refunds, transaction history, reconciliation and downloadable reports.
- Tips and split bill.
- Optional no-show deposits for reservations, with refund rules.

### 12.3 Security and regulatory requirements

- Create payment orders on the backend and verify payment signatures.
- Validate webhook authenticity and process webhooks idempotently.
- Never trust a frontend success callback alone.
- Never store card numbers, CVVs or UPI PINs.
- Keep Qfast subscription payments separate from restaurant customer payments.
- Use an approved marketplace or linked-merchant settlement arrangement, so funds settle directly to the restaurant.
- Do not pool restaurant funds in an ordinary Qfast bank account without proper regulatory authorization.
- Reconciliation job compares Razorpay settlements against Qfast payment records daily and flags mismatches.

## 13. Restaurant Staff Management

| Role | Access |
| --- | --- |
| Owner | All settings, billing, plan and reports |
| Manager | Operations, reports, feedback, offers and campaigns |
| Cashier | Orders, payments, refunds (with limits), loyalty redemption |
| Kitchen staff | Kitchen display only |
| Waiter | Assigned tables and customer requests |

- Role-based access control with branch-level scoping.
- Sensitive actions (refunds, manual loyalty adjustments, queue reordering, price changes) need specific permissions and are audit-logged.
- Essential has a staff limit. Advanced is unlimited.

## 14. Analytics and Reports

**Essential:** daily sales, order counts, average order value, best and least selling items, peak hours, queue waiting time.

**Advanced adds:**

- Weekly and monthly sales, revenue by order source and branch.
- Queue abandonment rate, average preparation time, table utilization and takeaway performance.
- Payment method breakdown and reconciliation reports.
- Repeat visits and customer lifetime value, for consented customers.
- Loyalty: enrollment, earn and redeem rates, outstanding points liability.
- Offers and campaigns: delivered, redeemed, attributed revenue and cost per redemption.
- Feedback: rating trends and issues by item, shift and table.
- Sponsored placements: impressions, clicks and revenue share earned.
- PDF and CSV exports.

## 15. Third-Party Integrations (Advanced)

An extensible integration framework for Swiggy, Zomato, POS systems, payment gateways, WhatsApp, SMS gateways and email services.

- Only use officially authorized APIs or approved integration partners. Never assume direct Swiggy or Zomato access is available.
- Incoming order webhooks, outgoing status updates, menu sync where supported, item mapping and external order identifiers.
- Duplicate-order protection through unique external IDs and idempotency.
- Integration health monitoring with alerts to the owner.
- Each integration is a plugin behind a common adapter interface.

## 16. Super Admin Dashboard

A separate Qfast administration application with:

- All registered businesses: approve, suspend and view activity.
- **Plans and entitlements:** manage plans, features, limits, prices, trials and per-business overrides.
- Subscription status, billing, failed payments and grace periods.
- Platform settings, announcements, support requests and system health.
- Platform-wide analytics: orders, queue tokens, payment integration status, message volume and credit usage.
- **Sponsor management:** sponsor accounts, campaigns, creative moderation, placement inventory, revenue share and payouts.
- Integration management and an audit trail of every admin action.

## 17. Multi-Tenant Architecture

- Each business has isolated data: orders, customers, staff, menu, tables, queue, reservations, payments, loyalty, offers, feedback and reports.
- Support multiple branches under one business, with an owner branch switcher (Advanced).
- Enforce tenant isolation in the backend (tenant-scoped guards and services) and at the database layer (Prisma middleware plus PostgreSQL row-level security as defense in depth).
- Customer identity is global by phone number, but each business only sees its own relationship with that customer. Consents and profiles are stored per business.
- Automated tests verify that cross-tenant access is impossible.

## 18. Future Clinic Support

Design the core so clinics can be added without a rebuild, while keeping clinic modules separate.

- Doctor profiles and availability, appointment booking, walk-in tokens, patient queue, waiting-time estimates, reminders, receptionist dashboard and consultation status.
- Sponsored placements and marketing campaigns are disabled by default for clinics.
- Patient data needs stronger privacy controls before clinics launch: encryption of sensitive fields, strict access logging, minimal data collection, retention limits and legal review.

## 19. User Interface Requirements

The UI must be modern, minimal, fast, mobile responsive, accessible, consistent and easy for non-technical owners.

Three distinct interfaces:

1. Customer QR experience, with minimal steps to join a queue or place an order.
2. Restaurant staff dashboard.
3. Qfast super admin dashboard.

Additional v2 guidance:

- Locked Advanced features appear as clear previews with a short benefit line and an upgrade button, and never as broken or hidden screens.
- Sponsored slots are visually distinct and never shift page layout after load.
- Meet WCAG 2.1 AA, support multiple languages and keep customer pages light for slow mobile networks.

## 20. Security, Privacy and Reliability

- Secure authentication, password hashing, role-based permissions and tenant-level access control.
- Input validation, API rate limiting, CSRF protection where applicable and secure HTTP headers.
- Webhook signature validation and secure file uploads.
- Audit logs, error logging, monitoring and database backups with tested restores.
- No secrets in frontend code.
- **Consent management:** per-purpose consent ledger, separate marketing consent, immediate opt-out, and consent checks enforced inside the notification engine, not in the UI.
- **Data retention:** configurable retention for queue history, feedback and profiles. Erasure and export on request.
- **Review policy:** automated tests ensure the Google link is shown regardless of rating and that no loyalty or offer rule references reviews.
- **Advertising safeguards:** labelling, category blocklists and no sponsor access to personal data.

## 21. Database Design

Normalized Prisma models with foreign keys, indexes, constraints and transaction boundaries.

**Original models:** User, Business, BusinessBranch, Staff, Role, Permission, Customer, CustomerConsent, Restaurant, Table, Menu, MenuCategory, MenuItem, MenuVariant, MenuAddon, Queue, QueueToken, Reservation, Order, OrderItem, Payment, Refund, Notification, NotificationLog, QRCode, Subscription, Integration, ExternalOrder, AuditLog.

**New in v2:**

- **Plans:** Plan, PlanFeature, SubscriptionOverride.
- **Messaging cost:** MessageCreditLedger.
- **Reviews:** ReviewRequest, Feedback, FeedbackItemRating.
- **Loyalty:** LoyaltyProgram, LoyaltyTier, LoyaltyReward, LoyaltyAccount, LoyaltyTransaction.
- **Offers:** Offer, Coupon, CouponRedemption, Campaign, CampaignRecipient.
- **Sponsorship:** Sponsor, SponsorCampaign, SponsorPlacement, PlacementImpressionDaily, SponsorPayout.

Key constraints:

- Unique (businessId, phone) on customer relationships, and unique idempotency keys on payments, redemptions and external orders.
- `LoyaltyTransaction` is append-only, and balances are derived or checked against it.
- Every tenant-owned table carries `businessId` (and `branchId` where relevant) and is indexed on it.

## 22. Development Instructions

Build a fully functional application, not a static demo: working authentication, real database integration, real CRUD, working queue logic, order management, real-time updates, QR generation, Razorpay in test mode, development-safe notification integrations, responsive interfaces and proper error handling. Mock data is for demonstrations only.

### Build phases

1. **Architecture, database and authentication.**
2. **Restaurant onboarding, menu and QR management,** plus plans, entitlements and Qfast subscription billing.
3. **Queue, reservations and table management.**
4. **Ordering, cart and kitchen display.**
5. **Real-time tracking and notifications,** including message categories, credits and the consent ledger.
6. **Payments and reconciliation** (Advanced).
7. **Analytics and reports.**
8. **Reviews, loyalty, offers and sponsored placements:** Google review flow and feedback inbox, customer profiles, loyalty program, offers and campaigns, sponsor management and placements.
9. **Super admin and multi-branch management.**
10. **Authorized external integrations** (Advanced).
11. **Testing, security hardening and deployment.**

At the end of each phase, provide: files created, features completed, database migrations, API endpoints, testing instructions and remaining tasks.

## 23. Open Decisions

1. **Plan names and prices,** and whether to add a free trial of Advanced.
2. **Sponsored placements model:** who sells inventory (Qfast or restaurants), and the revenue-share percentage.
3. **Google review prompt on Essential:** assumed included. Confirm.
4. **Essential staff limit** and which analytics stay in Essential.
5. **Message credits:** pricing, markup over provider cost, and auto top-up behavior.
6. **Whether Qfast charges a platform fee** on online payments, which depends on the marketplace arrangement with Razorpay.
7. **Legal review** before launch: DPDP Act compliance, advertising rules, payment regulation and WhatsApp commerce policy.

## Final Objective

Deliver Qfast as one scalable, multi-tenant platform where a restaurant owner can register, configure the business, add menu items, generate QR codes, manage queues, accept orders, run the kitchen and analyze performance on the Essential plan, and on the Advanced plan also take online payments, collect Google reviews and feedback, run loyalty and offers, earn from sponsored placements and connect authorized third-party services, all from a single dashboard.
