# MattBot Phase 1 Completion Checklist

> Cross-referenced against the **Phase 1 High Level Plan** and **Phase 1 Technical Plan**.
> Calendar is **not** in the Phase 1 plan — it is an additional feature and excluded from this checklist.

---

## Legend

- [ ] Not started / needs work
- [x] Already implemented and working

---

## 1. Frontend ↔ Backend API Mismatches (Critical)

These are confirmed broken paths where the mobile calls an endpoint that **does not exist** or uses the wrong path on the backend.

- [x] **1.1** ~~`statsStore` calls `GET /stats/calls` → backend exposes `GET /api/v1/stats`.~~ Fixed: now calls `/stats`.
- [x] **1.2** ~~`telephonyStore` calls `GET /telephony/numbers` → no `/telephony` route.~~ Fixed: now calls `/numbers`.
- [x] **1.3** ~~`CallerProfileScreen` calls non-existent `/callers/{phoneHash}/vip` and `/block`.~~ Fixed: now uses `POST /calls/{callId}/mark-vip` and `POST /calls/{callId}/mark-blocked` via `last_call_id`. Also fixed response field name mismatches (`call_count`, `last_call_date`, `vip_display_name`).

---

## 2. Auth, Registration & Login

- [x] 2.1 Email/password registration (`POST /auth/register`)
- [x] 2.2 Email/password login (`POST /auth/login`)
- [x] 2.3 Google OAuth login (`POST /auth/oauth/google`)
- [x] 2.4 Apple OAuth login (`POST /auth/oauth/apple`)
- [x] 2.5 Email verification (`POST /auth/email/verify`)
- [x] 2.6 Password reset request + confirm
- [x] 2.7 Password change
- [x] 2.8 Token refresh (`POST /auth/token/refresh`)
- [x] 2.9 Logout + logout all devices
- [x] 2.10 MFA: TOTP enrollment, verification, recovery codes
- [x] 2.11 Email OTP
- [x] 2.12 PIN setup, login, disable
- [x] 2.13 Step-up auth for sensitive operations
- [x] 2.14 Deep links for email verify + password reset

---

## 3. Devices & Push Notifications

- [x] 3.1 List devices (`GET /devices`)
- [x] 3.2 Register/update device (`POST /devices/register-or-update`)
- [x] 3.3 Revoke device (`POST /devices/{id}/revoke`)
- [x] 3.4 Remember device (`POST /devices/{id}/remember`)
- [x] 3.5 Push token registration (`POST /push/register`)
- [x] 3.6 Test push notification (`POST /push/test`)
- [x] 3.7 FCM service for Android push
- [x] **3.8** ~~APNS push for iOS~~ — Verified: mobile registers FCM tokens on both platforms; Firebase Admin SDK routes iOS tokens through APNS automatically. **Fixed**: `notify_call_screened` was only logging "Would send" — now actually calls `fcm_service.send_push_notification()`.

---

## 4. Onboarding Flow

- [x] 4.1 Onboarding state tracking (`GET /onboarding`, `POST /onboarding/complete-step`)
- [x] 4.2 OnboardingPrivacyScreen (step 1)
- [x] 4.3 OnboardingSettingsScreen (step 2) — timezone, language, theme
- [x] 4.4 OnboardingAssistantSetupScreen (step 3) — name, greeting, personality
- [x] 4.5 OnboardingCalendarSetupScreen (step 4) — calendar connect (bonus, not in plan)
- [x] **4.6** ~~Missing onboarding step: **Number provisioning**~~ Fixed: `PaymentMethodScreen` now navigates to `NumberProvision` (with `onboarding: true`); `NumberProvisionScreen` now calls `complete-step: number_provisioned` and navigates to `CallModes`.
- [x] **4.7** ~~Missing onboarding step: **Forwarding setup**~~ Fixed: `CallModesScreen` now has "Set Up Forwarding" button + "Finish Setup" button that completes `call_modes_configured` and `onboarding_complete`.
- [x] **4.8** ~~Missing onboarding step: **Subscription**~~ Fixed: `PaymentMethodScreen` now calls `complete-step: plan_selected` and `payment_method_added` when `source === 'onboarding'`.
- [ ] **4.9** Missing onboarding step: **Push notification permission** — the plan requires notification registration and test push during onboarding.
- [ ] **4.10** Missing onboarding step: **Biometric setup** — the plan requires biometric enrollment during onboarding.
- [ ] **4.11** Missing onboarding step: **First call test** — the plan requires a "test my AI number" flow that confirms the AI answered and a call record + notification were generated.

---

## 5. Call Modes & Routing

- [x] 5.1 Call mode settings screen (`CallModesScreen` → `PATCH /call-modes`)
- [x] 5.2 Backend call mode config model + API (`GET /call-modes`, `PATCH /call-modes`)
- [x] 5.3 Number provisioning screen (`NumberProvisionScreen` → `POST /numbers/provision`)
- [x] 5.4 Forwarding setup guide screen (`ForwardingSetupGuideScreen` → `GET /forwarding/setup-guide`)
- [x] 5.5 Forwarding verification screen (`ForwardingVerifyScreen` → `POST /forwarding/verify`, `GET /forwarding/verify/status`)
- [ ] **5.6** Verify forwarding verification actually works end-to-end (backend creates a test call, verifies AI answers, reports pass/fail).
- [ ] **5.7** "Who can reach my AI number" setting (Everyone / Contacts only / VIP only) — verify this is implemented in the call mode settings UI and enforced in the backend call handler.

---

## 6. Inbound Call Handling (Realtime Bridge)

- [x] 6.1 Twilio Media Stream WebSocket → ElevenLabs ConvAI audio bridge
- [x] 6.2 Agent runtime fetch from backend (`GET /internal/calls/{call_id}/agent-runtime`)
- [x] 6.3 Lifecycle events to backend (`POST /internal/events`)
- [x] 6.4 Twilio inbound voice webhook (`POST /webhooks/twilio/voice/inbound`)
- [x] 6.5 Twilio status webhook (`POST /webhooks/twilio/voice/status`)
- [x] 6.6 ElevenLabs conversation ended webhook (`POST /webhooks/elevenlabs/conversation`)
- [ ] **6.7** Verify the assistant identifies itself as acting on behalf of the user (configured via agent prompt/greeting).
- [ ] **6.8** Verify the screening conversation captures: caller name, reason, urgency, callback number.
- [ ] **6.9** Verify VIP caller priority handling in the AI conversation.
- [ ] **6.10** Verify blocked caller handling (low-noise + logging).
- [ ] **6.11** Verify max call duration enforcement.
- [ ] **6.12** Verify recording announcement when recording is enabled.

---

## 7. Post-Call Processing

- [x] 7.1 Post-call worker processes artifacts (transcript, summary, labels)
- [x] 7.2 Call artifacts API (`GET /calls/{id}/artifacts`)
- [x] 7.3 Transcript API (`GET /calls/{id}/transcript`, retry)
- [x] 7.4 Summary regeneration (`POST /calls/{id}/summary/regenerate`)
- [x] 7.5 Recording API (`GET /calls/{id}/recording`)
- [x] 7.6 Memory item creation from calls
- [x] 7.7 Push notification on call screened
- [ ] **7.8** Verify partial failure handling — if transcript fails, call record still exists and shows failure state in UI.
- [ ] **7.9** Verify summary failure handling — same as above.
- [ ] **7.10** Verify label assignment: VIP, urgent, spam, sales, normal, unknown.
- [ ] **7.11** Verify label explanations are stored and displayed.

---

## 8. Call History & Call Detail

- [x] 8.1 Call list screen with filters (all, missed, VIP, spam)
- [x] 8.2 Call detail screen with summary, transcript, recording, actions, memory, labels, timeline
- [x] 8.3 Search bar on calls list
- [ ] **8.4** Call source label — each call should display whether it came from "Dedicated AI number" or "Forwarded from personal number". Verify this is shown.
- [ ] **8.5** Verify `Urgent` filter chip works — currently there's an "Urgent" chip visible in the screenshot but the code only has `all`, `missed`, `vip`, `spam`. The `Urgent` filter is not implemented.

---

## 9. Follow-Up Actions

### 9A. Call Back
- [ ] **9.1** "Call back" action is **not implemented** on CallDetailScreen. The plan requires the user to be able to call back from the call record. This needs: decrypt caller phone → `Linking.openURL('tel:...')`. Backend has `GET /calls/{id}/caller-phone` for this.

### 9B. Text Back (Approval-First)
- [x] 9.2 TextBackScreen exists with template selection
- [x] 9.3 Draft creation (`POST /messages/calls/{callId}/text-back/draft`)
- [x] 9.4 Draft approval (`POST /messages/actions/{id}/approve`)
- [x] 9.5 Backend SMS worker sends approved messages
- [x] 9.6 Text-back templates API
- [ ] **9.7** Verify draft editing before approval — the plan says user can edit before approving.
- [ ] **9.8** Verify delivery status and failure display in UI.
- [ ] **9.9** Verify retry for failed sends (`POST /messages/actions/{id}/retry`).

### 9C. Notes
- [x] 9.10 Add note action on CallDetailScreen
- [x] 9.11 Notes stored via `PATCH /calls/{id}`

### 9D. Reminders
- [x] 9.12 Create reminder screen (`POST /reminders/calls/{callId}`)
- [x] 9.13 Reminders list screen
- [x] 9.14 Complete/delete/cancel reminders
- [x] 9.15 Backend reminder worker checks due reminders
- [ ] **9.16** Verify reminder triggers push notification when due.

### 9E. Block & Spam
- [x] 9.17 Block from call detail (`POST /calls/{id}/mark-blocked`)
- [x] 9.18 Mark spam from call detail
- [x] 9.19 Block list management screen
- [ ] **9.20** Verify label correction — the plan says users can correct/change labels from the call record.

---

## 10. Live Handoff

- [x] 10.1 Handoff service (eligibility, create/accept/decline offers, expiry)
- [x] 10.2 Handoff API (`POST /calls/{id}/handoff/accept`, `decline`, `GET handoff`)
- [x] 10.3 HandoffBanner component
- [x] 10.4 Transfer service (loop detection, suppression)
- [x] 10.5 Backend emits handoff events to realtime bridge → mobile WebSocket
- [ ] **10.6** Verify handoff banner appears on mobile when handoff is offered via WebSocket.
- [ ] **10.7** Verify multi-device arbitration (only one device can accept).
- [ ] **10.8** Verify timeout behavior (assistant resumes if not accepted).
- [ ] **10.9** Verify voicemail detection during handoff.
- [ ] **10.10** Verify loop prevention (forwarding loop safety).
- [ ] **10.11** Verify handoff configuration UI — `HandoffSettingsScreen` exists, verify it patches correct settings.

---

## 11. Personalization & User Settings

- [x] 11.1 Voice selection (`AssistantSettingsScreen`, `GET /voices`, `PATCH /agents/{id}`)
- [x] 11.2 Temperament preset (`TemperamentScreen`)
- [x] 11.3 Assistant name + greeting instructions
- [x] 11.4 Business hours screen (`BusinessHoursScreen` → `PATCH /call-modes`)
- [x] 11.5 Quiet hours screen (`QuietHoursScreen` → `PATCH /settings`)
- [x] 11.6 VIP list management (`VipListScreen`)
- [x] 11.7 Block list management (`BlockListScreen`)
- [x] 11.8 Urgent notifications settings (`UrgentNotificationsScreen`)
- [x] 11.9 Profile settings (name, company, etc.)
- [ ] **11.10** After-hours behavior rules — verify "Always answer and screen" / "Always take message only" / "Mark as low priority unless VIP/urgent" options exist.

---

## 12. Privacy & Security

- [x] 12.1 Biometric gate component (`BiometricGate`)
- [x] 12.2 Privacy settings screen (notification preview, biometric toggle)
- [x] 12.3 Data retention settings
- [x] 12.4 Delete single call (`DELETE /calls/{id}`)
- [x] 12.5 Delete all calls (`DELETE /calls/delete-all`, step-up required)
- [x] 12.6 Account deletion (`POST /me/delete-account`, step-up required)
- [x] 12.7 Memory on/off and deletion controls
- [x] 12.8 Retention worker (soft-delete expired calls)
- [x] 12.9 Hard deletion worker (purge after 7-day grace)
- [x] 12.10 Audit event logging + API
- [ ] **12.11** Verify notification privacy default is **private** (no sensitive content on lock screen).
- [ ] **12.12** Verify biometric gate is required for transcripts, recordings, and sensitive content — not just app entry.

---

## 13. Billing & Subscription

- [x] 13.1 Plan listing (`GET /billing/plans`)
- [x] 13.2 Subscription status (`GET /billing/status`)
- [x] 13.3 Subscribe to plan (`POST /billing/subscribe`)
- [x] 13.4 Change plan (`POST /billing/change-plan`)
- [x] 13.5 Cancel subscription (`POST /billing/cancel`)
- [x] 13.6 Payment methods management (list, add, remove, set default)
- [x] 13.7 Stripe webhook handling
- [x] 13.8 Subscription gate screen (blocks app when inactive)
- [x] 13.9 ManageSubscriptionScreen
- [x] 13.10 PlanSelectionScreen
- [x] 13.11 Dev billing for testing (`POST /dev/billing/set-plan`)

---

## 14. Realtime Events (WebSocket)

- [x] 14.1 Mobile `realtimeStore` with WebSocket to `/ws/events`
- [x] 14.2 Backend → bridge → mobile event fan-out
- [x] 14.3 Bridge authenticates mobile WebSocket via JWT
- [ ] **14.4** Verify the mobile app **reconnects** on WebSocket drop (check reconnect logic in `realtimeStore`).
- [ ] **14.5** Verify these events are handled on mobile: `call_started`, `call_completed`, `handoff_offered`, `handoff_accepted`, `call_screened`.

---

## 15. Infrastructure & Deployment

- [x] 15.1 Docker Compose (backend + realtime + redis + nginx + certbot)
- [x] 15.2 GitHub Actions deploy workflows (dev, staging, prod)
- [x] 15.3 Nginx reverse proxy config
- [x] 15.4 Alembic migrations (29 migrations)
- [x] 15.5 Health check endpoints (backend + realtime)
- [ ] **15.6** SSL/HTTPS — nginx HTTPS server block is **commented out**. Need to enable for production.
- [ ] **15.7** Sentry integration — env vars exist (`SENTRY_DSN`) but verify Sentry is initialized in both backend and mobile.

---

## 16. Admin Portal (Internal)

- [ ] **16.1** Admin portal is **NOT BUILT**. The Phase 1 plan requires an internal admin web portal with:
  - User management (search, status, device list, session revoke)
  - Call processing status and failure diagnostics
  - Forwarding diagnostics
  - Operational health dashboards
  - Data deletion support
  - RBAC (Admin, Support, Viewer roles)
- [ ] **16.2** Decide: build minimal admin portal or defer to post-launch.

---

## Priority Order for Fixes

### P0 — Broken / Will crash or show wrong data
1. **1.1** Fix `statsStore` path: `/stats/calls` → `/stats`
2. **1.2** Fix `telephonyStore` path: `/telephony/numbers` → `/numbers`
3. **1.3** Fix `CallerProfileScreen` VIP/block actions — use correct endpoints

### P1 — Missing core functionality from the plan
4. **9.1** Implement "Call back" action on CallDetailScreen
5. **8.5** Add `Urgent` filter to CallsListScreen (visible in UI but not wired)
6. **4.6** Wire number provisioning into onboarding flow
7. **4.7** Wire forwarding setup into onboarding flow
8. **4.8** Add push notification permission step to onboarding
9. **4.9** Add biometric setup step to onboarding
10. **4.10** Add "test my AI number" step to onboarding
11. **5.7** Implement "Who can reach my AI number" setting UI

### P2 — Verification & hardening
12. **3.8** Verify APNS push delivery for iOS
13. **5.6** Test forwarding verification end-to-end
14. **7.8–7.11** Verify post-call failure handling and label display
15. **8.4** Add call source label (dedicated vs forwarded)
16. **9.7–9.9** Verify text-back editing, delivery status, retry
17. **9.16** Verify reminder push notifications
18. **9.20** Verify label correction from call detail
19. **10.6–10.11** Test live handoff end-to-end
20. **11.10** Verify after-hours behavior rules
21. **12.11–12.12** Verify notification privacy defaults + biometric scope
22. **14.4–14.5** Verify WebSocket reconnect + event handling

### P3 — Infrastructure & admin
23. **15.6** Enable SSL/HTTPS in nginx
24. **15.7** Verify Sentry initialization
25. **16.1** Build or defer admin portal
