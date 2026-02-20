# **Chapter 1: Mattbot Project overview and Phase 1 promise**

## **1.1 Purpose of the Mattbot Project**

The Mattbot Project is a mobile application, supported by a backend “brain”, that delivers a personal AI agent experience for end users. The long term goal is an agent that can communicate and take actions across multiple channels, including phone calls, SMS, email, and social platforms, while remaining fully configurable by each user through a customer-facing dashboard.

This project is designed to be deployed to major app stores and built in a way that allows expansion through future updates. Expansion means two things:

1. Adding new channels and integrations without rewriting the core system  
2. Increasing agent capability over time while keeping user control, privacy, and safety as first-class requirements

Phase 1 focuses on one channel only: phone calls. This is intentionally narrow so the product can ship faster, prove value, and establish the technical foundation that later phases build on.

---

## **1.2 What Phase 1 is, in one sentence**

Phase 1 is a phone concierge MVP that answers calls when the user is busy or unreachable, screens callers, and sends the user a clear summary and transcript, with strong privacy and security controls.

---

## **1.3 Who Phase 1 is for**

Phase 1 targets users who receive calls they cannot or do not want to answer immediately, but still need to:

* Capture important messages reliably  
* Know which calls matter right now  
* Reduce interruptions and spam  
* Follow up later without losing context

Typical examples include freelancers, small business owners, salespeople, founders, busy professionals, creators, and anyone who wants an “assistant line” that protects their attention.

Phase 1 supports:

* Multiple user accounts  
* Multiple devices per account (phone and tablet)  
* Biometric access control for sensitive call content (transcripts and recordings, if enabled)

---

## **1.4 The core problems Phase 1 solves**

### **1.4.1 Missed important calls**

Users often miss important calls because they are busy, in meetings, driving, asleep, or simply overwhelmed. Traditional voicemail does not reliably capture what happened or what is needed next. Phase 1 solves this by collecting structured information and delivering it in a readable format.

### **1.4.2 Too many interruptions**

Many calls are low value: spam, sales, unknown numbers, wrong number, or non-urgent requests. Phase 1 reduces interruptions by acting as the first line of response, capturing the reason for the call before the user decides what to do.

### **1.4.3 Loss of context for follow-ups**

Even when voicemail exists, it often creates work: replaying recordings, taking notes, remembering details. Phase 1 turns calls into organized call records with summaries, transcripts, urgency labels, and one-tap follow-up actions.

---

## **1.5 What Phase 1 delivers**

Phase 1 delivers an end-to-end experience that includes mobile app user experience, backend logic, telephony integration, and security controls. The deliverables are grouped below in plain language.  

### **1.5.1 Call handling modes**

Phase 1 supports two inbound call modes. Users can enable either or both.

**Mode A: Dedicated AI number**

* The user is assigned an AI-managed phone number.  
* Callers can dial this number directly.  
* The user controls who is allowed to reach this number using simple settings.

**Mode B: Conditional call forwarding fallback**

* The user keeps their normal phone number.  
* When the user is busy or unreachable, the call is forwarded to the AI.  
* The AI answers and performs screening, then sends the results to the user.

The key promise is that the AI only answers forwarded calls when the user cannot, not for every call. This reduces friction for users who want normal calling most of the time, but want help when they cannot answer.

### **1.5.2 Caller screening conversation**

When the AI answers a call, it runs a short screening conversation with a clear goal: collect the information needed for the user to decide what to do next.

Phase 1 screening is designed to feel natural and human-friendly, including light small talk if needed, but it remains focused on capturing:

* Who is calling  
* Why they are calling  
* How urgent it is  
* How to reach them back

If a caller refuses to answer questions, the AI falls back to a simple message-taking flow so the call still produces something useful.

### **1.5.3 Post-call output to the user**

After each call, the user receives a call record containing:

* A concise summary written for fast reading  
* A full transcript for detail  
* Labels such as urgency and possible spam  
* Optional recording link, if recording is enabled by the user

The output is designed to be useful immediately, without needing to replay audio or manually write notes.

### **1.5.4 Notifications**

Users receive notifications when the AI has handled a call. Notifications are configurable, including privacy settings that can hide content on the lock screen.

This is important because call content can be sensitive. Phase 1 treats privacy as a standard expectation, not an optional add-on.

### **1.5.5 Follow-up actions**

From the call record, the user can take simple actions:

* Call back  
* Text back with approval-first behavior  
* Add a note  
* Set a reminder  
* Block a number

The purpose is to turn call screening into a complete workflow: receive, understand, decide, act.

### **1.5.6 Personalization and user controls**

Phase 1 includes a customer-facing settings area that acts as the first version of the personalization dashboard. Users can control:

* Voice selection and tone preset  
* Business hours behavior  
* VIP allow list and block list  
* Whether live handoff is enabled and under what conditions  
* Whether outbound texts require approval (default yes)  
* Whether call recording is enabled (default off)  
* Data retention duration and deletion controls  
* Memory on/off and memory deletion controls

The system is designed so these settings become reusable across future phases.

### **1.5.7 Security and privacy baseline**

Phase 1 includes security controls as part of the MVP scope:

* Data protection in storage and transport  
* Strong access controls to prevent cross-user data exposure  
* Biometric protection for call content  
* Clear retention and deletion behavior  
* Audit logs for sensitive actions such as device changes and deletions  
* Abuse prevention controls such as rate limits and blocking

These controls are mandatory because Phase 1 handles personal communications that may include private information.

---

## **1.6 What Phase 1 does not deliver**

To avoid scope creep and ensure Phase 1 can ship, the following items are explicitly out of scope for Phase 1:

1. Inbox management for email and messaging channels  
2. Social media integrations  
3. Link and document reading features  
4. Full automation that takes actions without the user approving them  
5. Deep “always learning” browsing-based memory of user online activity  
6. Complex subagent orchestration beyond the call concierge workflow  
7. Web3 or on-chain functionality

These items are part of the broader vision, but they are intentionally deferred to later phases.

---

## **1.7 How Phase 1 sets up Phase B and Phase C**

Phase 1 is not just a standalone feature. It also creates the foundation for later phases, so the project does not need a rewrite.

### **1.7.1 Foundations Phase 1 must establish**

Phase 1 must build these shared foundations:

* **Identity and permissions**  
  Multi-user accounts, device trust, and per-user data isolation must be correct from day one.  
* **Personalization system**  
  A consistent way to store and apply user settings, such as tone, voice, and approval rules.  
* **Event and notification framework**  
  A reusable system for sending push notifications and recording events that later channels can use.  
* **Data lifecycle controls**  
  Retention, deletion, and memory management must be consistent, since later phases expand data types.  
* **Integration pattern**  
  A clear pattern for adding future connectors. Phase 1 includes at least one integration type, telephony, and should structure it so email and social channels can be added in Phase B without redesign.

### **1.7.2 Phase B and Phase C in context**

* **Phase B** expands communication channels: email plus one messaging channel, with draft-first and approval-first outbound actions.  
* **Phase C** expands into reading and decision support: summarizing user-provided links and files, discussing them, and storing preferences with explicit user control.

Phase 1’s job is to prove value quickly on calls and build the core platform pieces that make Phase B and C straightforward.

---

## **1.8 High level success criteria for Phase 1**

Phase 1 is considered successful when:

* Users can set up dedicated number and conditional forwarding in a guided way.  
* Calls are answered when the user is busy or unreachable, not all the time.  
* Every handled call produces a summary and transcript visible inside the app.  
* Notifications are delivered reliably across multiple devices.  
* VIP and block rules work consistently.  
* Biometric protection and deletion controls function correctly.  
* The system is stable enough for real daily use with predictable behavior.

---

## **1.9 Key assumptions and constraints**

* Replacing native voicemail at the operating system level is not the goal. Voicemail replacement is achieved through call forwarding and dedicated numbers.  
* Carrier forwarding behavior can vary. The app must include a test and guidance flow to help users verify their setup.  
* Some features, such as call recording and voice cloning, add legal and support complexity. Phase 1 must implement safe defaults and clear user controls if they are included.

# **Chapter 2: User accounts, devices, and onboarding**

## **2.1 Purpose of this chapter**

This chapter defines how end users create accounts, add devices, and complete the initial setup required for Phase 1 to work reliably. It also explains the rules for multi-user data separation, multi-device behavior, and the security controls that protect sensitive call content.

Phase 1 must treat identity, device trust, and privacy as core product behavior. If account and device foundations are weak, all later features become risky to build and difficult to support.

---

## **2.2 Key goals for Phase 1**

Phase 1 account and onboarding must achieve the following outcomes:

1. A user can create an account and sign in successfully.  
2. A user can use the same account on multiple devices, such as a phone and a tablet.  
3. A user can enable biometric unlock so transcripts and recordings are protected.  
4. The system can reliably send notifications to all of the user’s devices.  
5. The system ensures strict separation between different users’ data.  
6. The onboarding steps make it clear which call modes are enabled and how to test them.

---

## **2.3 User account model**

### **2.3.1 Multi-user accounts**

Phase 1 supports multiple user accounts. Each account represents one end user. The user owns their own:

* Call history  
* Call details (summary, transcript, recordings if enabled)  
* VIP list and block list  
* Business hours and call handling rules  
* Voice and temperament settings  
* Memory items and preferences  
* Notification preferences

No data is shared between users by default. Any future “shared access” features must be explicitly designed and are not assumed in Phase 1\.

### **2.3.2 Identity uniqueness**

Each user account must have a unique identity in the system. The app must prevent duplicates and support predictable recovery flows. The exact method used for user identity can vary by implementation, but the behavior requirements are:

* User can log in consistently across devices  
* User can recover access if they lose a device  
* User can revoke devices and sessions

### **2.3.3 Account lifecycle actions**

Phase 1 must support these account actions:

* Sign up  
* Sign in  
* Sign out  
* Sign out of all devices  
* Change password or login method, if applicable  
* Delete account, including data deletion behavior

Account deletion must be explicit and confirmed, because it affects call records and memory.

---

## **2.4 Device model and multi-device behavior**

### **2.4.1 What a “device” means**

In Phase 1, a device is any mobile device where the user is signed in to the app and is eligible to receive notifications. Typical examples are:

* Primary phone  
* Secondary phone  
* Tablet

Each device has a unique record in the backend so the system can manage:

* Push notification delivery  
* Device trust status  
* Biometric requirements  
* Session validity  
* Device removal and lost-device handling

### **2.4.2 Multi-device expectations**

When a user signs in on multiple devices, the following behaviors must be consistent:

* Call history and call details remain identical across devices.  
* Settings changes made on one device appear on the other device after synchronization.  
* Notifications are delivered to all devices unless the user disables notifications on a specific device.  
* A user can revoke a device, and the revoked device loses access immediately.

### **2.4.3 Device naming and management**

The app should present devices in a simple list to help users understand what is connected. For each device, the user should see:

* Device name or label, such as “Kat’s iPhone” or “Tablet”  
* Last active time  
* Notification status  
* An option to remove the device

This supports practical security. If a user loses a phone, they can remove it quickly.

---

## **2.5 Biometric unlock requirements**

### **2.5.1 What biometric unlock protects**

Biometric unlock applies to sensitive call content. At minimum, it protects:

* Transcripts  
* Recording playback, if recordings are enabled  
* Detailed caller information and notes, if considered sensitive by product rules

Users can still see a safe “call list” view without unlocking, depending on privacy settings. For example, they can see that a call exists but not see the transcript contents until unlocked.

### **2.5.2 When biometric unlock is required**

Biometrics should be required in these moments:

* Opening call detail content for the first time after app launch  
* Returning to the app after it has been inactive for a configurable time window  
* Opening any recording link or playback control  
* Viewing or exporting sensitive data, if export is implemented later

### **2.5.3 Biometric fallback behavior**

If biometrics fail, the app should fall back to the device-level secure fallback method. This keeps the behavior consistent with user expectations and reduces support burden.

---

## **2.6 Onboarding flow, step by step**

### **2.6.1 Onboarding entry point**

A new user begins onboarding after account creation or first sign in. The onboarding flow should be a guided checklist. The user sees progress and can return later if they are not ready to finish all steps.

### **2.6.2 Step 1: Create account and verify access**

The onboarding starts with:

* Creating the user account  
* Signing in successfully  
* Confirming the user can reach the main home screen

The app must clearly explain that Phase 1 works by either using a dedicated AI number, conditional call forwarding, or both.

### **2.6.3 Step 2: Register device for notifications**

The app must request permission for push notifications and confirm success. If the user declines:

* The app continues to function.  
* The app explains that call summaries will not appear instantly.  
* The user can enable notifications later in settings.

The onboarding should include a small test action, such as sending a test push, so the user knows notifications are working.

### **2.6.4 Step 3: Enable biometric unlock**

The app explains why biometrics exist and what they protect. The user then enables biometric unlock.

The app should also offer a notification privacy choice during onboarding:

* Show call details in notifications  
* Hide call details on lock screen

A safe default is to hide sensitive details unless the user explicitly wants preview content.

### **2.6.5 Step 4: Choose call modes to enable**

The user selects which call modes to activate:

* Dedicated AI number mode  
* Conditional call forwarding fallback mode  
* Both

This is an important decision. The onboarding must explain it in simple terms:

* Dedicated AI number is a separate number callers can dial.  
* Call forwarding fallback sends calls to AI only when the user is busy or unreachable.

### **2.6.6 Step 5A: Dedicated AI number setup**

If dedicated number is selected:

* The app assigns a number.  
* The app shows the number clearly and explains when to use it.  
* The app asks who can reach it:  
  * Everyone  
  * Contacts only  
  * VIP only

The app also provides a simple share function, such as copy, share button, and QR code, if desired. The goal is to make it easy for a user to start using the assistant line immediately.

The onboarding includes a test call option so the user can verify the AI answers and produces a call record.

### **2.6.7 Step 5B: Conditional call forwarding setup**

If call forwarding fallback is selected:

* The app explains that call forwarding depends on the mobile carrier.  
* The app provides a step-by-step guide for enabling forwarding rules.  
* The app includes a “test forwarding” feature.

The test should verify the intended behavior: calls route to AI only when the user is busy or unreachable. The app should guide the user through the test steps in a controlled way, for example:

* First test: call the user’s normal number while the user is available, confirm the AI does not answer.  
* Second test: simulate busy or unreachable state, call again, confirm the AI answers.

The app should warn the user that forwarding behavior may differ by carrier and that some users may need to adjust settings to achieve the desired behavior.

### **2.6.8 Step 6: Configure basic assistant settings**

The onboarding flow should include a minimal configuration so the product works well from day one:

* Select voice preset  
* Select temperament preset  
* Set business hours  
* Add at least one VIP contact, optional  
* Confirm whether texting back is enabled and remains approval-first

This step should keep choices simple. The goal is to reduce user confusion while still delivering personalization.

### **2.6.9 Step 7: First real call confirmation**

The onboarding ends with a “first call success” confirmation. This is where the user sees:

* A call record in call history  
* A summary  
* A transcript  
* A notification event

This is critical. It converts onboarding from theoretical setup into a clear proof that the product is working.

---

## **2.7 Core settings required in Phase 1**

### **2.7.1 Account settings**

* Profile basics  
* Sign out  
* Sign out all devices  
* Delete account  
* Privacy controls

### **2.7.2 Device settings**

* List of signed-in devices  
* Remove device  
* Notification preferences per device, if supported

### **2.7.3 Security and privacy settings**

* Biometric unlock toggle  
* Notification preview privacy  
* Data retention window  
* Delete all call data  
* Memory on/off and memory deletion

---

## **2.8 Data rules and synchronization**

### **2.8.1 Cross-device sync rules**

Any time the user changes:

* Voice selection  
* Temperament preset  
* Business hours  
* VIP list  
* Block list  
* Call handling settings  
* Notification privacy settings  
* Recording preferences  
* Memory preferences

Those changes must be saved to the backend and synchronized to all devices for that user.

### **2.8.2 Conflict handling**

If two devices change the same setting at the same time, the system must handle it predictably. A simple and understandable rule is:

* The most recent change becomes the active value.  
* The app shows the current value after sync.

The user should never be placed in a confusing “half updated” state.

---

## **2.9 Security and privacy requirements in this chapter**

### **2.9.1 Data separation**

User data must be isolated by design. The system must ensure:

* A user can never access another user’s calls or settings.  
* A device can only access the account it is authenticated for.

### **2.9.2 Session and device security**

* Sessions must expire and be refreshable securely.  
* Removing a device must revoke its access immediately.  
* The backend must record device changes and security events in audit logs.

### **2.9.3 Onboarding security risks**

The onboarding flow is a common target for abuse. The system must include:

* Rate limiting for sign-up and sign-in attempts  
* Detection of unusual activity such as repeated attempts from the same source  
* Safe error messages that do not reveal sensitive details

---

## **2.10 Completion checklist for this chapter**

This chapter’s requirements are complete when:

* Users can create accounts and sign in.  
* One account can be used on multiple devices with consistent data.  
* Users can revoke devices and sign out everywhere.  
* Biometrics protect call content.  
* Notifications can be tested and confirmed.  
* Dedicated number setup works and can be tested.  
* Conditional call forwarding setup has guided steps and a test flow.  
* Settings sync correctly across devices.  
* Data separation is enforced at the backend level.

# **Chapter 3: Call modes and routing**

## **3.1 Purpose of this chapter**

This chapter defines how Phase 1 routes inbound calls into the AI assistant, using two supported call modes:

1. Dedicated AI number mode  
2. Conditional call forwarding fallback mode (busy or unreachable only)

It also defines the settings that control call routing, the expected behavior for callers and users, and the testing steps that confirm routing is working correctly. Routing is the heart of Phase 1\. If routing is unreliable, all other features, including summaries, transcripts, and notifications, lose value.

---

## **3.2 Core routing goals for Phase 1**

Phase 1 routing must achieve these outcomes:

* The AI can receive inbound calls reliably.  
* The user can choose which call mode to use, or use both.  
* The forwarding fallback only triggers when the user is busy or unreachable.  
* The user can test each mode and confirm it is working.  
* The system records enough information to show what happened during a call and why it was handled by AI.

---

## **3.3 Call mode A: Dedicated AI number**

### **3.3.1 What this mode is**

In this mode, the user is assigned an AI-managed phone number. Callers dial this number directly. The AI answers and performs screening. The user receives the call record afterward.

This mode is intended for users who want a separate “assistant line” they can share for work, public contact, or privacy.

### **3.3.2 The user experience**

The user will see the dedicated AI number in the app and can:

* Copy or share the number  
* Turn this mode on or off  
* Control who can reach the number  
* View call history from this number together with other calls

### **3.3.3 Access control for the dedicated number**

Phase 1 supports a simple setting called “Who can reach my AI number”:

* Everyone (default)  
* Contacts only  
* VIP only

This setting affects how the AI handles incoming calls to the dedicated number:

**Everyone**

* AI answers all calls.  
* AI screens and labels unknown callers.  
* AI can suggest blocking repeat spam.

**Contacts only**

* If caller is not in contacts, AI either:  
  * Asks for name and purpose, then proceeds, or  
  * Politely declines and requests the caller to use another method, depending on the chosen rule set.  
* The default behavior should still be helpful. The recommended default is to proceed with screening, but label unknown callers clearly.

**VIP only**

* If caller is not in the VIP list, AI uses a stricter flow:  
  * It can request a short message and callback number, then end the call.  
  * It labels the call as “non-VIP” to help the user filter later.

The app must explain these options clearly because users may not understand the difference until they see it in practice.

### **3.3.4 Dedicated number call flow behind the scenes**

At a high level, the routing sequence is:

1. Caller dials the dedicated AI number.  
2. Telephony provider routes the call to the backend call handler.  
3. The call handler starts the AI conversation flow.  
4. The system captures transcript and metadata.  
5. The system ends the call and generates summary output.  
6. The system stores the call record and sends notifications.

### **3.3.5 Dedicated number mode test**

Phase 1 must include a built-in test button:

* “Test my AI number”  
* It guides the user to call the number from another phone  
* It confirms:  
  * AI answered  
  * Call record exists  
  * Summary and transcript are visible  
  * Notification arrived

The test result should show a simple pass or fail with clear next steps.

---

## **3.4 Call mode B: Conditional call forwarding fallback**

### **3.4.1 What this mode is**

In this mode, the user keeps their normal phone number. Calls are forwarded to the AI only when the user is busy or unreachable. The AI screens the call and produces the call record.

This mode is designed to feel like voicemail replacement without changing how the user normally receives calls.

### **3.4.2 Important constraint: carrier behavior**

Conditional call forwarding often depends on mobile carrier support and the user’s phone settings. Phase 1 must assume that:

* Different carriers may support different combinations of busy, no-answer, and unreachable forwarding.  
* Forwarding setup may require manual steps.  
* Users need clear guidance and a verification test.

The app should not hide this reality. It should guide users through it.

### **3.4.3 Forwarding triggers supported in Phase 1**

Phase 1 targets two triggers:

* Busy  
* Unreachable

If the carrier only supports “no answer” or has combined behavior, the app should adapt and explain what the user can realistically achieve.

The product promise remains the same: AI answers only when the user is not able to answer.

### **3.4.4 Forwarding setup flow in the app**

The app provides a guided setup that includes:

1. Explanation in simple language  
2. A checklist the user completes  
3. A test flow that proves forwarding works

The setup steps should include:

* Which forwarding triggers are desired  
* What the user must configure on their phone or carrier settings  
* How to test each trigger

The app should provide carrier-agnostic instructions first, then optional carrier-specific instructions later.

### **3.4.5 Forwarding fallback behavior for callers**

When the call is forwarded to AI, the caller experience is the same as if they called the dedicated AI number:

* The AI answers, introduces itself as an assistant, and collects screening details.  
* The AI produces a call record for the user.

The caller should not feel they called a different system. It should feel consistent and professional.

### **3.4.6 Forwarding call flow behind the scenes**

At a high level, the routing sequence is:

1. Caller dials the user’s normal number.  
2. Phone network attempts to reach the user.  
3. If busy or unreachable, the call is forwarded to the AI number.  
4. Telephony provider routes the call to the backend call handler.  
5. AI conversation flow runs.  
6. Transcript, summary, labels are produced.  
7. Call record is stored and notifications are sent.

Phase 1 must store a routing reason when possible, such as “forwarded due to busy” or “forwarded due to unreachable”. If the carrier does not provide that detail, the system should still store that the call arrived via forwarding.

### **3.4.7 Forwarding mode test**

Phase 1 must include a “Test call forwarding” tool. It should guide the user through two tests:

**Test 1: AI should not answer**

* User calls their normal number while they are available.  
* Expected outcome: AI does not answer.  
* If AI answers, the app flags misconfiguration and suggests turning off unconditional forwarding.

**Test 2: AI should answer**

* User simulates busy or unreachable state, then calls again.  
* Expected outcome: AI answers and creates a call record.  
* The app confirms summary and transcript are available and that notifications were received.

The app should also include troubleshooting tips if the user’s carrier behavior does not match the ideal setup.

---

## **3.5 Combined mode behavior (both enabled)**

### **3.5.1 What “both enabled” means**

If both modes are enabled:

* Calls to the dedicated AI number always go to the AI.  
* Calls to the user’s normal number only go to AI when forwarded due to busy or unreachable.

The call history should show both types in one place but should label the call source clearly so the user understands why it was handled by AI.

### **3.5.2 Call source labels**

Each call record should include a “source” label:

* Dedicated AI number  
* Forwarded from personal number

This prevents confusion and helps the user evaluate how well routing is working.

---

## **3.6 Routing settings required in Phase 1**

### **3.6.1 Mode toggles**

* Dedicated AI number: On or Off  
* Forwarding fallback: On or Off

### **3.6.2 Dedicated number access control**

* Who can reach my AI number: Everyone, Contacts only, VIP only

### **3.6.3 Business hours interaction**

Business hours should affect call behavior. Phase 1 must support:

* After-hours behavior rules:  
  * Always answer and screen  
  * Always take message only  
  * Mark as low priority unless VIP or urgent

Business hours should not change routing. They change how the AI behaves after answering.

### **3.6.4 Live handoff interaction**

Routing settings must connect cleanly with live handoff settings:

* Live handoff can be Off, VIP only, Urgent only, VIP plus Urgent  
* When live handoff is enabled and conditions are met, the user is offered a “take over” option

This does not change whether the AI answers. It changes whether the user can interrupt and take the call live.

---

## **3.7 Failure behavior and fallback rules**

### **3.7.1 If AI cannot answer**

If the backend call handler fails or the AI service is unavailable, Phase 1 must define a fallback:

* The call should not drop silently.  
* The system should route to a safe fallback path such as message-taking or provider-level voicemail flow, depending on telephony capabilities.

The user should receive a notification that the call was not fully processed.

### **3.7.2 If forwarding is misconfigured**

If the user accidentally sets unconditional forwarding, the AI may answer every call. The app must detect this pattern if possible:

* If AI answers calls even when the user is available, show a warning.  
* Provide a guided fix checklist.

### **3.7.3 If the caller hangs up early**

If the caller hangs up before screening is complete:

* The system stores what it captured so far.  
* The summary reflects incomplete data.  
* The user still gets a notification and call record.

---

## **3.8 Security and privacy requirements in routing**

### **3.8.1 Routing data sensitivity**

Routing settings reveal personal behavior, such as business hours and VIP lists. Phase 1 must:

* Protect these settings behind authentication.  
* Treat VIP lists and block lists as sensitive data.  
* Ensure no user can access another user’s routing configuration.

### **3.8.2 Abuse prevention**

Dedicated numbers can be abused by spam callers. Phase 1 must include:

* Rate limiting  
* Blocking tools  
* Repeat spam detection patterns  
* Defensive defaults for unknown callers

---

## **3.9 Completion checklist for this chapter**

This routing chapter is complete when:

* A user can enable a dedicated AI number and receive screened calls reliably.  
* A user can enable forwarding fallback and confirm it triggers only for busy or unreachable scenarios, within realistic carrier constraints.  
* The app includes guided setup and test tools for both modes.  
* Calls are labeled correctly as dedicated or forwarded.  
* Routing settings are clear, understandable, and adjustable.  
* Failure and fallback behaviors are defined and tested.

# **Chapter 4: AI call conversation and screening**

## **4.1 Purpose of this chapter**

This chapter defines the behavior of the AI during an inbound call. It describes what the AI says, what information it must collect, how it labels urgency and spam, and how it behaves when callers are uncooperative, emotional, or unclear.

The goal of screening in Phase 1 is not to solve the caller’s problem. The goal is to capture enough structured information so the user can decide what to do next, quickly and confidently.

---

## **4.2 Screening principles for Phase 1**

Phase 1 screening must follow these principles:

1. Be polite and efficient.  
2. Collect the required information every time.  
3. Allow light small talk only when it helps clarify the request.  
4. Avoid long conversations and avoid giving advice beyond basic guidance.  
5. End the call cleanly once the goal is achieved.  
6. Never pretend to be the user. The AI is presented as an assistant.  
7. Support user control through settings, including call length and live handoff.

---

## **4.3 Standard call flow (default behavior)**

### **4.3.1 Step 1: Greeting and identity**

Default greeting format:

* Introduce the assistant  
* State that the user is unavailable  
* Ask permission to take a message

Example:  
“Hi, this is Alex, an assistant for Kat. Kat can’t take the call right now. Can I take a message and pass it along?”

This is the default because it is clear, builds trust, and reduces confusion.

### **4.3.2 Step 2: Caller name**

The AI asks:  
“May I have your name?”

If caller refuses, the AI continues with a fallback approach:  
“No problem. What’s the best way for Kat to refer to you when calling back?”

The system should capture whatever the caller provides, even if it is partial.

### **4.3.3 Step 3: Reason for calling**

The AI asks:  
“What are you calling about?”

The AI should gently push for clarity if the caller is vague:  
“Could you share a quick summary in one sentence, so I can pass it on clearly?”

The AI should not interrogate the caller. It should aim for a simple explanation that fits in a summary.

### **4.3.4 Step 4: Callback number confirmation**

The AI confirms the callback number. It should handle two cases:

* If the caller’s number is visible, confirm it:  
  “I see your number as \[ending digits\]. Is that the best number to call back?”  
* If it is not visible, ask:  
  “What number should Kat call you back on?”

If the caller provides a number, the AI repeats it back for confirmation.

### **4.3.5 Step 5: Urgency question**

The AI asks a simple urgency question:

“Is this urgent, or can it wait until later?”

The user-facing urgency levels are:

* Low  
* Normal  
* Urgent

The caller should not be forced to pick from a menu. The AI can interpret their answer into the three levels.

### **4.3.6 Step 6: Optional best time to call back**

The AI asks:  
“When is a good time for Kat to call you back?”

This is optional. If the call is labeled urgent, the AI can ask a slightly stronger version:  
“When do you need a call back by?”

### **4.3.7 Step 7: Close**

The AI closes politely:

“Thanks, I’ll pass this to Kat. If anything changes, you can call back.”

If the user has enabled message texting in later steps, Phase 1 still remains approval-first. The AI does not promise an automatic text unless the product explicitly supports it.

---

## **4.4 Call length rules and timeouts**

### **4.4.1 Default call length limits**

Phase 1 defaults:

* Standard callers: maximum 3 minutes  
* VIP callers: maximum 5 minutes

If the AI has collected the required fields early, it should end sooner.

### **4.4.2 Ending due to time limit**

If time is running out, the AI gives a short warning:  
“I want to respect your time. One last thing, what’s the key message you want Kat to see?”

Then it closes and stores what it captured.

### **4.4.3 Caller talking too long**

If the caller keeps talking without providing structured details, the AI should redirect politely:  
“I want to make sure I capture this correctly. What is the main thing you need from Kat?”

This produces better summaries and reduces the chance of useless transcripts.

---

## **4.5 Special flows**

### **4.5.1 VIP caller flow**

If the caller is on the VIP list, the AI changes tone slightly:

* More accommodating  
* Shorter path to urgency  
* Optionally prompts live handoff if enabled

Example:  
“Hi, this is Alex, an assistant for Kat. Kat can’t take the call right now. Is this urgent, or can it wait?”

If live handoff is enabled for VIP calls:

* The AI screens briefly, then alerts the user.  
* The AI continues screening while waiting for user action.

### **4.5.2 Unknown caller flow**

If the caller is unknown, the AI stays professional and collects the same fields. The only difference is the AI may add one extra question:

“Are you calling personally, or on behalf of a company?”

This helps the user interpret the call quickly.

### **4.5.3 Blocked caller flow**

If the caller is blocked:

* The AI does not engage in screening.  
* The system ends the call quickly or routes to a short message depending on the product decision.  
* The user is not notified by default unless they choose to see blocked call attempts.

Phase 1 should keep blocked behavior simple and consistent.

### **4.5.4 Sales or solicitation flow**

If the AI detects sales intent:

* The AI collects basic reason and contact info.  
* The AI ends quickly.

Example:  
“Thanks. Please share a one-sentence summary and the best email or number to reach you. I’ll pass it along.”

This reduces spam time costs.

### **4.5.5 Emotional or distressed caller flow**

If the caller is emotional, the AI should remain calm and focus on capture:

“I’m here with you. Tell me the main thing you need Kat to know right now.”

The AI does not provide therapy or complex advice. It captures the message and urgency.

---

## **4.6 Urgency labeling rules**

### **4.6.1 User-facing urgency labels**

Phase 1 uses three labels:

* Low  
* Normal  
* Urgent

This keeps the system understandable for non-technical users.

### **4.6.2 Automatic urgency cues**

The AI can label urgent if any of these are true:

* Caller directly says it is urgent or an emergency  
* Caller references medical issues, accidents, safety, family emergencies  
* The caller is VIP and VIP urgency boost is enabled  
* The same caller has repeated calls in a short time window

The AI should record why it labeled something urgent. This reason can be shown in call detail as a small note, such as “Marked urgent due to caller keywords” or “Marked urgent due to VIP rule.”

### **4.6.3 User override**

The user can override urgency later in the call detail screen. This is important because automatic rules can be wrong.

---

## **4.7 Spam and quality labeling rules**

### **4.7.1 Labels used in Phase 1**

Phase 1 supports lightweight labels:

* Possible spam  
* Sales  
* Unknown  
* Normal call

These labels help users filter call history.

### **4.7.2 Spam detection cues**

Phase 1 spam detection should remain conservative. It can mark possible spam if:

* The caller refuses to answer name and reason  
* The caller plays a prerecorded message pattern  
* The call has long silence or repeated identical behavior  
* The number has repeated short calls without content

Phase 1 must avoid aggressive auto-blocking. The system can suggest blocking, but the user decides.

### **4.7.3 User actions**

On call detail, the user can:

* Mark as spam  
* Block the number  
* Unblock the number  
* Correct a wrong label

---

## **4.8 Live handoff interaction during screening**

### **4.8.1 When live handoff is triggered**

Live handoff can be triggered by settings:

* VIP only  
* Urgent only  
* VIP and urgent

When triggered:

* The AI continues screening and captures details.  
* The user receives a prompt to take over.

### **4.8.2 Handoff timing**

Phase 1 should keep this predictable:

* AI must collect at least name and reason before prompting handoff, unless the call is highly urgent.  
* The prompt includes a short preview:  
  * Caller name  
  * One-line reason  
  * Urgency

### **4.8.3 If the user does nothing**

If the user ignores the prompt:

* The AI continues the call as normal  
* The call ends with summary and transcript

---

## **4.9 Voice and temperament behavior during calls**

### **4.9.1 Voice selection**

Voice is selected by the user in settings. The voice must be consistent across calls.

If “user’s voice” is supported later, it must be handled as a controlled feature with consent and verification. Phase 1 can be structured to support this later without shipping it immediately.

### **4.9.2 Temperament presets**

Temperament presets control:

* Formal vs casual style  
* Humor level  
* Allowed language rules, including swearing  
* Accent preference, if supported by the voice system

Presets keep the product simple. Users should not be forced to tune complex sliders in Phase 1\.

### **4.9.3 Safety boundaries**

Regardless of temperament, the assistant should avoid:

* Harassment or insults  
* Threatening language  
* Misrepresenting itself as the user  
* Sharing sensitive information

---

## **4.10 Data captured during screening**

For every call, Phase 1 should store:

* Call timestamps (start, end)  
* Caller number, if available  
* Call mode source (dedicated number vs forwarded)  
* Collected screening fields:  
  * Caller name  
  * Reason  
  * Callback number  
  * Optional company  
  * Optional best callback time  
  * Urgency label and reason  
  * Spam label, if applied  
* Transcript  
* Summary after the call  
* Whether handoff was offered and whether it was accepted  
* Whether recording exists, if enabled

---

## **4.11 Failure and edge-case behavior**

### **4.11.1 Audio quality issues**

If audio is poor:

* The AI asks short clarifying questions.  
* It notes uncertainty in the transcript and summary.  
* It avoids guessing.

### **4.11.2 Caller language mismatch**

If caller speaks a different language:

* The AI attempts to continue if supported.  
* If not supported, it captures a minimal message:  
  * Name  
  * Callback number  
  * One short reason if possible

### **4.11.3 Caller hangs up early**

If caller hangs up early:

* Store partial capture  
* Still notify user  
* Summary states that the call ended early

### **4.11.4 AI misunderstanding**

If the AI is unsure, it should ask one clarifying question, not many. The goal is to avoid long back-and-forth.

---

## **4.12 Completion checklist for this chapter**

This chapter is complete when:

* The standard screening flow consistently collects required fields.  
* VIP, unknown, and blocked caller flows behave correctly.  
* Urgency labeling works with simple rules and user override.  
* Spam labeling exists and remains conservative.  
* Live handoff interacts correctly with screening and settings.  
* Call time limits work and produce clean endings.  
* All required data is captured reliably for summaries, transcripts, and notifications.

# **Chapter 5: Call outputs, call records, and what the user receives**

## **5.1 Purpose of this chapter**

This chapter defines what Phase 1 produces after every handled call and how those outputs are presented to the user. The outputs are the main product value. The call is temporary, but the call record is what the user uses to make decisions and follow up later.

Phase 1 must produce outputs that are:

* Fast to read  
* Easy to trust  
* Consistent across calls  
* Safe to view on multiple devices  
* Protected by privacy controls

---

## **5.2 What a “call record” is**

A call record is a single saved entry created after the AI answers a call. It is the source of truth for what happened.

Each call record includes:

* Call summary  
* Call transcript  
* Labels (urgency, spam, VIP)  
* Caller details  
* Call source (dedicated number vs forwarded)  
* Actions and follow-ups (callbacks, texts, notes, reminders)  
* Optional recording link if enabled  
* Timestamps and status fields

The call record must be synchronized across all of the user’s devices.

---

## **5.3 Outputs produced after every call**

### **5.3.1 Summary**

The summary is the first thing a user reads. It must be short and useful.

Phase 1 summary format should be consistent:

* 3 to 6 bullets maximum  
* First bullet always explains the reason for calling  
* Include callback details and urgency  
* Avoid filler and avoid guessing

Recommended summary bullets:

* Caller name and number  
* Main reason for calling, in one sentence  
* Requested action from the user, if any  
* Deadline or best time to call back, if provided  
* Urgency label with a short reason  
* Any important extra detail

If the call ended early:

* Summary must explicitly state that the call ended before full screening.

If the AI is uncertain:

* Summary must state uncertainty rather than invent details.

### **5.3.2 Transcript**

The transcript is the full conversation text. It must be:

* Complete  
* Timestamped at least by speaker turns  
* Linked to the call record  
* Searchable if Phase 1 includes transcript search

Phase 1 must store who said what:

* Caller  
* Assistant

The transcript should support these user actions:

* Copy selected text  
* Share transcript text if the user chooses, with a warning about privacy

Transcripts should be protected behind biometric unlock based on the user’s security settings.

### **5.3.3 Labels and tags**

Phase 1 must attach labels that help users filter and prioritize:

Required labels:

* Urgency: Low, Normal, Urgent  
* VIP status: VIP or not VIP  
* Spam label: Possible spam, Sales, Unknown, Normal call

These labels should be visible in:

* Call history list  
* Call detail view  
* Notification preview, if enabled

Users must be able to edit labels because automatic labeling can be wrong.

### **5.3.4 Caller details**

Each call record must show:

* Caller name (as provided)  
* Caller number (if available)  
* Callback number (confirmed or provided)  
* Optional company or relationship

If some details are missing:

* The UI should show “Not provided” rather than leaving it blank.

### **5.3.5 Optional recording link**

Recordings are optional and off by default. If recording is enabled:

* The call record includes a recording entry.  
* The app protects access behind biometric unlock.  
* The user can play it inside the app.

The call record should show:

* Recording length  
* Date and time recorded  
* Any consent flag or note if the system stores it

If recording fails:

* The call record still exists.  
* The call record should show “Recording unavailable” and give a simple reason if possible.

---

## **5.4 Call history experience (list view)**

### **5.4.1 What the user sees**

The call history is a list of call records. Each row must show enough information to decide whether to open it.

Each row should include:

* Caller display: name or number  
* One-line reason snippet from the summary  
* Urgency badge  
* Spam or VIP badge if relevant  
* Date and time  
* Call source label:  
  * Dedicated AI number  
  * Forwarded from personal number

### **5.4.2 Filters and search**

Phase 1 should include basic filters:

* All  
* Important (Urgent and VIP)  
* VIP  
* Possible spam  
* Missed or incomplete (ended early)

If transcript search is included:

* Search should match name, number, summary text, and transcript text.

Filters should never hide calls without clear user intent.

---

## **5.5 Call detail experience**

### **5.5.1 What the user sees first**

The call detail screen should be structured in this order:

1. Summary  
2. Key info panel  
3. Action buttons  
4. Transcript  
5. Optional recording

This layout matches user intent. Most users want the summary first, then actions.

### **5.5.2 Key info panel**

This is a compact area showing:

* Caller name  
* Caller number and callback number  
* Urgency label and reason  
* Call source  
* Call duration  
* Whether live handoff was offered and whether it was accepted

### **5.5.3 Action buttons in call detail**

Phase 1 actions include:

* Call back  
* Text back (approval-first)  
* Add note  
* Set reminder  
* Block or unblock number  
* Mark as spam or correct label

Actions must be consistent across iOS and Android.

### **5.5.4 Notes**

Notes allow the user to add their own context.

Notes must:

* Be editable  
* Be stored in the call record  
* Sync across devices

Notes should never be mixed with the transcript. They are user-written content.

### **5.5.5 Reminders**

Reminders allow the user to schedule follow-up.

Reminders must include:

* Title or reason  
* Date and time  
* Link back to the call record

Phase 1 reminders should be in-app only. Calendar integration is deferred.

---

## **5.6 Notification content rules**

### **5.6.1 Notification types**

Phase 1 supports at least these notification types:

* New call screened and call record created  
* Important call detected (urgent or VIP)  
* Handoff available, if live handoff is enabled  
* Error notifications, such as call could not be processed fully

### **5.6.2 Notification privacy controls**

Users must be able to choose notification preview behavior:

* Private mode: show “New call screened” without details  
* Preview mode: show caller name and one-line reason

Private mode should be the safe default.

### **5.6.3 Multi-device notifications**

If a user has multiple devices:

* All devices should receive the notification.  
* If the user disables notifications on one device, the others still receive them.

---

## **5.7 Text back output and approval flow**

### **5.7.1 Draft suggestions**

After screening, Phase 1 can suggest drafts such as:

* “Thanks for calling. Kat is busy. What is this regarding?”  
* “Kat will call you back today. What is the best time?”  
* “Please share the key details by text and Kat will follow up.”

These are suggestions only. They are not sent automatically.

### **5.7.2 Approval-first sending**

When the user taps “Text back”:

1. App shows a draft preview  
2. User edits or approves  
3. The message is sent  
4. The call record stores:  
   * Message content  
   * Timestamp  
   * Delivery status if available

If sending fails:

* Show a clear failure reason  
* Allow retry  
* Store the failure status for user clarity

---

## **5.8 Data retention, deletion, and export rules for call records**

### **5.8.1 Retention window**

Users can choose retention duration, such as:

* 7 days  
* 30 days  
* 90 days

After retention expires:

* Call records are deleted automatically  
* Recordings are deleted as part of the same policy

Retention rules must apply consistently across all stored call content.

### **5.8.2 Delete a single call record**

When a user deletes a call record, the system must remove:

* Summary  
* Transcript  
* Recording link and file, if any  
* Notes, reminders, and memory items linked to that call, if applicable

Deletion must be confirmed because it is irreversible.

### **5.8.3 Delete all call data**

The app must support a “Delete all call data” option.

It must:

* Explain what will be deleted  
* Require confirmation  
* Execute deletion fully  
* Update the app UI so the user sees the result

### **5.8.4 Export behavior**

Export is optional in Phase 1\. If export is included:

* It must be user-initiated  
* It must be protected behind biometrics  
* It must be logged in audit logs

If export is deferred, Phase 1 should still store call records in a way that allows safe export later without redesign.

---

## **5.9 Data integrity and reliability requirements**

### **5.9.1 Call record creation must be durable**

Even if summarization fails:

* The call record must still exist  
* The transcript should still be stored if available  
* The summary can show “Summary unavailable” and allow retry generation

### **5.9.2 Partial content handling**

If the call ends early:

* Store partial transcript  
* Summary highlights incomplete capture

If audio was unclear:

* Transcript includes uncertainty markers  
* Summary avoids guessing and states what was not clear

### **5.9.3 Versioning and updates**

If the user edits labels or notes:

* The call record updates immediately across devices  
* The system stores the latest state as the current truth

Audit logs should record major changes to sensitive content if required by security design.

---

## **5.10 Completion checklist for this chapter**

This chapter is complete when:

* Every handled call produces a call record.  
* Call history list shows the right badges, snippet, and source.  
* Call detail shows summary, transcript, labels, and action buttons.  
* Users can edit labels and add notes and reminders.  
* Push notifications arrive and respect privacy settings.  
* Recording appears only when enabled and is protected behind biometrics.  
* Retention and deletion rules work and delete all related stored content.  
* The system handles partial and failed outputs without losing the call record.

# **Chapter 6: Notifications and urgency handling**

## **6.1 Purpose of this chapter**

This chapter defines how Phase 1 notifies users about calls handled by the AI and how the system decides what is important. Notifications are not just alerts. In Phase 1, they are the main bridge between the real world call event and the user’s next action.

A good notification system must do three things at the same time:

1. Deliver alerts reliably on all user devices  
2. Protect sensitive call content by default  
3. Help the user decide quickly whether to act now or later

---

## **6.2 Core notification goals for Phase 1**

Phase 1 notifications must achieve the following outcomes:

* The user is notified when a new call record is created.  
* Important calls are clearly distinguished from normal calls.  
* Urgent and VIP calls can trigger stronger alerts if the user wants.  
* Notification content can be hidden on the lock screen to protect privacy.  
* Multi-device delivery works consistently.  
* Notification behavior is predictable and controlled by settings.

---

## **6.3 What “importance” means in Phase 1**

### **6.3.1 Importance signals**

Phase 1 uses a small set of signals to decide whether a call is important:

* Urgency label: Low, Normal, Urgent  
* VIP status: VIP or not VIP  
* Spam label: Possible spam, Sales, Unknown, Normal call  
* Repeated attempts: same caller calling multiple times in a short window  
* Live handoff eligibility: call meets user rules for takeover

These signals are not perfect. Phase 1 must always allow the user to override labels and correct false positives.

### **6.3.2 The definition of “Important”**

A call is considered Important when any of the following is true:

* Urgency is Urgent  
* Caller is VIP  
* Caller has repeated attempts in a short period and is not blocked  
* Live handoff conditions are met and enabled

All other calls are treated as Normal unless the user changes labels.

### **6.3.3 Why Phase 1 keeps it simple**

Phase 1 avoids complex scoring systems because:

* Users must understand why something was marked urgent.  
* Complex models can produce confusing results and reduce trust.  
* Simple rules are easier to test and maintain.

---

## **6.4 Notification types in Phase 1**

### **6.4.1 New call screened notification**

Triggered when the AI finishes a call and the call record is created.

Purpose:

* Tell the user the AI handled a call.  
* Provide a quick summary preview or a private placeholder, depending on settings.

### **6.4.2 Important call notification**

Triggered when the system marks the call as Important.

Purpose:

* Increase visibility of calls that likely require attention soon.  
* Allow stronger alert behavior if enabled.

Important calls still create normal call notifications. The Important notification can either replace the normal notification or upgrade it, depending on implementation.

### **6.4.3 Live handoff available notification**

Triggered when live handoff is enabled and the call meets the user’s handoff rules.

Purpose:

* Give the user a chance to take the call live.  
* Provide enough preview to make a decision, without leaking content on lock screen.

### **6.4.4 Error or degraded service notification**

Triggered when the system cannot produce full outputs, such as:

* Transcript unavailable  
* Summary generation failed  
* Recording failed when enabled  
* Call routing problems detected

Purpose:

* Keep the user informed without creating panic.  
* Give clear next steps, such as retry summary or check forwarding settings.

---

## **6.5 Notification content rules**

### **6.5.1 Content must be short and predictable**

Notifications must be designed for fast scanning. The user should be able to understand the essentials in one glance.

Recommended content fields:

* Caller display: name or number  
* One-line reason snippet  
* Urgency badge, if not private mode  
* Source label: dedicated AI number or forwarded

### **6.5.2 Privacy modes for notifications**

Phase 1 must provide a simple privacy setting that controls what is visible on the lock screen:

**Private mode (recommended default)**

* Notification shows minimal content:  
  * “New call screened”  
  * “Important call screened”  
* No caller name, reason, or transcript preview

**Preview mode**

* Notification may show:  
  * Caller name or number  
  * One-line reason snippet  
  * Urgency badge

This setting must be easy to understand and easy to change. It should be part of onboarding and also present in settings.

### **6.5.3 Notification deep link behavior**

When the user taps the notification:

* The app opens the call detail screen for that call record.  
* If biometric protection is enabled, the app requests biometric unlock before showing transcript or recordings.

The app should still allow access to the summary if the product design considers summary safe. If summary is also treated as sensitive, biometrics should protect it as well. This is a product decision that must be consistent.

---

## **6.6 Multi-device notification behavior**

### **6.6.1 Default delivery behavior**

If a user has multiple devices signed in:

* All devices receive notifications by default.

This ensures users do not miss important calls if they are using a tablet while their phone is elsewhere.

### **6.6.2 Per-device notification controls**

Phase 1 should support per-device controls if feasible:

* Enable notifications on this device  
* Disable notifications on this device

If per-device controls are not implemented, Phase 1 should still handle the common case:

* If the user disables push notifications at the operating system level on one device, the other devices remain active.

### **6.6.3 Duplicate notification experience**

Users may see the same notification on multiple devices. Phase 1 should keep the notification message consistent so the user recognizes it as the same event.

If the user opens the call on one device, Phase 1 may optionally clear the notification on other devices. This is a nice-to-have. It is not required for initial MVP.

---

## **6.7 Urgency handling and user experience**

### **6.7.1 What urgency changes**

Urgency changes three things:

1. How the call appears in call history filters  
2. How the notification is classified and displayed  
3. Whether live handoff can be triggered, if enabled

Urgency should not change whether the AI answers. That is controlled by routing and settings.

### **6.7.2 Urgency display standards**

Urgency must be visible in:

* Call history list as a badge  
* Call detail view as a label with a short reason  
* Notification, if preview mode is enabled

If private mode is enabled, urgency should be hidden from lock screen.

### **6.7.3 Urgency reason transparency**

If the system marked a call urgent based on cues, it should store a short reason such as:

* “Caller said it is urgent”  
* “VIP rule”  
* “Repeated calls”

This reason helps users trust the system and correct it when wrong.

### **6.7.4 User override of urgency**

The user must be able to change urgency on the call detail screen. When the user changes urgency:

* The call record updates across devices.  
* Filters update immediately.  
* The new urgency becomes the active truth for that call.

---

## **6.8 Quiet hours and business hours**

### **6.8.1 Business hours vs quiet hours**

Phase 1 should treat these as separate concepts:

* Business hours: affects how the assistant behaves on calls, such as after-hours scripts.  
* Quiet hours: affects how notifications behave.

Users often want the assistant to answer calls at any time but do not want loud notifications at night.

### **6.8.2 Quiet hours rules**

Quiet hours settings should include:

* Start time  
* End time  
* Days of week  
* Behavior during quiet hours:  
  * Silent notifications  
  * Normal notifications for Important calls only  
  * Always normal notifications

The recommended default is:

* During quiet hours, notify silently for normal calls, notify normally for Important calls.

### **6.8.3 After-hours call handling interaction**

If business hours are closed:

* The assistant can still screen calls, but can mark calls low priority by default.  
* VIP and urgent rules can override this.

This reduces noise without losing information.

---

## **6.9 Live handoff notification behavior**

### **6.9.1 Handoff notification content**

A handoff notification must contain enough preview for the user to decide quickly, but must still respect privacy settings.

In private mode:

* “Call takeover available”

In preview mode:

* Caller name or number  
* One-line reason snippet  
* Urgency badge

### **6.9.2 Handoff timing requirements**

Handoff notification timing must be fast. If the notification arrives too late, the call may already be ending.

Phase 1 should aim for:

* Trigger handoff after minimum screening data is captured, such as name and reason.  
* Send handoff notification immediately.

### **6.9.3 Handoff timeout behavior**

If the user does not respond within a configured window:

* The assistant continues screening and ends normally.  
* The call record is still created.

The call record should show:

* Handoff offered: Yes  
* Handoff accepted: No

---

## **6.10 Error notifications and user trust**

### **6.10.1 When to notify errors**

Phase 1 should notify the user for errors that affect product value:

* AI did not answer when it should have  
* Transcript could not be produced  
* Summary could not be produced  
* Forwarding appears misconfigured  
* Recording failed when enabled

Phase 1 should not spam users with minor technical errors that do not affect their experience.

### **6.10.2 How error notifications should be written**

Error notifications must be:

* Simple  
* Action-oriented  
* Non-technical

Examples of acceptable wording:

* “Call screened, but transcript is unavailable. You can retry later.”  
* “Forwarding test failed. Please check your forwarding settings in the app.”

### **6.10.3 Error resolution inside the app**

When the user taps an error notification, the app should take them to:

* The call record, if it exists, and show what is missing.  
* Or a troubleshooting page, if the issue is configuration-related.

---

## **6.11 Security and privacy requirements in this chapter**

### **6.11.1 Lock screen leakage prevention**

Lock screens are a common privacy risk. Phase 1 must provide:

* Private notification mode  
* Biometric gating for transcripts and recordings  
* A clear explanation in onboarding of why privacy mode exists

### **6.11.2 Sensitive notification content policy**

Phase 1 must define what content is considered sensitive. At minimum:

* Transcript text is sensitive  
* Recording playback is sensitive  
* Caller reason can be sensitive depending on the user

Because users have different privacy needs, Phase 1 should allow a user to decide whether caller reason appears on lock screen.

### **6.11.3 Audit logging for notification settings changes**

Notification settings changes affect privacy. Phase 1 should record:

* When privacy mode is changed  
* When quiet hours are changed  
* When live handoff rules are changed

This is mainly useful for security review and debugging.

---

## **6.12 Completion checklist for this chapter**

This chapter is complete when:

* New call notifications are sent reliably for every call record.  
* Important call behavior is consistent with urgency and VIP rules.  
* Live handoff notifications appear quickly and respect privacy mode.  
* Quiet hours can be configured and work as expected.  
* Notification content is short, predictable, and safe by default.  
* Multi-device notification delivery works reliably.  
* Error notifications exist for major failures and lead users to clear next steps.

# **Chapter 7: Actions and follow-ups**

## **7.1 Purpose of this chapter**

This chapter defines what the user can do after the AI screens a call. Phase 1 must not stop at “here is a summary.” It must help users act quickly, with minimal friction, while keeping control and privacy intact.

Actions and follow-ups are where Phase 1 becomes a complete workflow:

1. Receive a screened call  
2. Understand it fast  
3. Decide what to do  
4. Act or schedule an action  
5. Keep the result attached to the call record

---

## **7.2 Goals for Phase 1 actions**

Phase 1 actions must achieve these outcomes:

* The user can call back in one tap.  
* The user can text back, but messages are approval-first by default.  
* The user can add notes to preserve context.  
* The user can set reminders to follow up later.  
* The user can block numbers or mark spam.  
* Every action is attached to the call record and syncs across devices.

---

## **7.3 Action set in Phase 1**

### **7.3.1 Call back**

**What it does**

* Initiates a call to the caller’s confirmed callback number.

**What the user sees**

* A “Call back” button in the call detail screen.  
* Optional confirmation if the number is not verified or looks unusual.

**Behind the scenes**

* The app uses the phone’s normal calling function.  
* The call record stores:  
  * That the user initiated a callback  
  * Timestamp of action

**Edge cases**

* If no callback number exists, disable the button and show “Callback number not provided.”  
* If caller number differs from provided callback number, show both and let the user choose.

### **7.3.2 Text back (approval-first)**

**What it does**

* Drafts a message to the caller and sends it only after user approval.

**What the user sees**

* A “Text back” button.  
* A draft preview screen with:  
  * Editable text  
  * Recipient number  
  * “Send” and “Cancel”  
  * Optional template selector

**Approval rules**  
Approval-first is the default behavior for all users and all callers. Phase 1 may allow the user to relax rules only in specific cases, such as VIPs, but the product should keep the default strict.

**Behind the scenes**

* The app or backend generates a draft.  
* The user edits or approves.  
* The message is sent through the configured messaging route.  
* The call record stores:  
  * Draft content  
  * Final sent content  
  * Timestamp  
  * Delivery status, if available

**Edge cases**

* If sending fails, show a clear reason and allow retry.  
* If the caller number cannot receive texts, show “Text not supported for this number.”

### **7.3.3 Add note**

**What it does**

* Lets the user attach their own text notes to the call record.

**What the user sees**

* A notes section on the call detail screen.  
* Add and edit controls.

**Behind the scenes**

* Notes are stored as part of the call record data.  
* Notes sync across devices.

**Edge cases**

* Notes must be protected by the same privacy rules as call details if the user has biometric lock enabled.  
* Notes must not be mixed into transcripts. They remain separate.

### **7.3.4 Set reminder**

**What it does**

* Creates an in-app reminder linked to the call record.

**What the user sees**

* “Set reminder” button.  
* A simple reminder form:  
  * When to remind (date and time)  
  * Optional reminder label, such as “Call back John”  
  * Save button

**Behind the scenes**

* Reminder is stored server-side and linked to the call record.  
* The system sends a push notification when the reminder triggers.  
* Reminder appears in a reminders list in the app.

**Edge cases**

* If the user disables notifications, reminders still exist but will not alert. The app should warn the user.  
* If the user deletes the call record, linked reminders should be deleted or the app should ask what to do. The default should be delete to reduce clutter.

### **7.3.5 Block number**

**What it does**

* Prevents a caller from reaching the AI assistant line in the future.  
* Optionally ends calls quickly if a blocked caller reaches the system.

**What the user sees**

* “Block” button on call detail.  
* “Block list” management in settings.  
* Confirmation prompt to prevent accidental blocking.

**Behind the scenes**

* The number is added to the user’s block list.  
* Future inbound calls from that number follow the blocked caller flow.  
* The call record stores:  
  * That the user blocked the number  
  * Timestamp

**Edge cases**

* If a blocked number calls again, the app can remain silent by default to avoid spam noise.  
* Users can unblock in settings.

### **7.3.6 Mark as spam and label correction**

**What it does**

* Lets the user correct system labels.

**What the user sees**

* Buttons such as:  
  * “Mark spam”  
  * “Not spam”  
  * “Sales”  
  * “Unknown”  
  * “Normal call”  
* Editable urgency label:  
  * Low, Normal, Urgent

**Behind the scenes**

* Updates the call record labels.  
* Updates filtering and prioritization immediately.

**Edge cases**

* Label changes should sync across devices quickly.  
* If a user marks spam, the app can suggest blocking.

---

## **7.4 Draft suggestions and templates**

### **7.4.1 Why templates matter**

Templates are a high-value, low-complexity feature. They reduce effort and produce consistent replies. They also reduce the risk of the AI generating unexpected messages because templates are controlled.

### **7.4.2 Template types in Phase 1**

Phase 1 should include:

* Greeting templates for the assistant call flow  
* Text reply templates for follow-ups

Text templates examples:

* “I’m busy right now. Please share the key details by text.”  
* “Thanks for calling. I will call you back today. What time works best?”  
* “Please send your request in one message so I can respond faster.”

### **7.4.3 Template selection UI**

On the text draft preview screen:

* A template dropdown or quick buttons  
* Editing always allowed  
* Save user-custom templates as optional in Phase 1  
  * If custom templates are included, keep it limited and simple

### **7.4.4 Suggested drafts after calls**

After a call ends, Phase 1 can show a suggestion row:

* “Suggested reply”  
* “Set reminder”  
* “Block number”

These are suggestions only. Nothing is sent automatically.

---

## **7.5 Action history and linking**

### **7.5.1 Why action history is important**

Users want a trace of what they already did. Without action history, a user may:

* Call back twice  
* Forget they already texted  
* Lose track of reminders

### **7.5.2 What Phase 1 stores as action history**

For each call record, store:

* Callback initiated timestamp  
* Text draft created timestamp  
* Text sent status and timestamp  
* Notes added or updated timestamps  
* Reminders created and triggered timestamps  
* Block/unblock events

This can be shown in a small “Activity” section in the call detail screen.

---

## **7.6 Reminders system details**

### **7.6.1 Reminder list screen**

Phase 1 should include a reminders screen that shows:

* Upcoming reminders  
* Completed reminders  
* Overdue reminders

Each reminder should link back to its call record.

### **7.6.2 Reminder notification behavior**

Reminder notifications must follow the user’s privacy mode:

* Private: “Reminder”  
* Preview: include reminder label

Quiet hours should affect reminder notification sound behavior, but reminders should still show up.

### **7.6.3 Snooze behavior**

Snooze is optional in Phase 1\. If included, keep it simple:

* Snooze 10 minutes  
* Snooze 1 hour  
* Snooze to tomorrow

---

## **7.7 Security and privacy requirements for actions**

### **7.7.1 Approval-first enforcement**

Texting must not occur without explicit user approval by default. If the user enables auto-send rules later, Phase 1 must still keep the default strict.

### **7.7.2 Biometric protection**

If biometrics are enabled:

* Notes and transcript content should be protected.  
* Sending a text does not require biometrics, but viewing the content may.

### **7.7.3 Preventing accidental actions**

Phase 1 should include confirmations for:

* Blocking a number  
* Deleting a reminder  
* Deleting call records  
* Deleting all call data

Call back and text back should not require extra confirmation because they are normal actions, but the UI should be clear to avoid mis-taps.

### **7.7.4 Audit logging**

The system should store audit events for:

* Text sent actions  
* Block and unblock actions  
* Deletion actions

This supports debugging and future security review.

---

## **7.8 Failure behavior and edge cases**

### **7.8.1 Messaging failures**

If a text cannot be sent:

* Show a clear failure status.  
* Allow retry.  
* Keep the draft saved so the user does not lose work.

### **7.8.2 Reminder delivery failures**

If push notifications fail:

* Reminders remain in the list.  
* The app shows a “notifications disabled” warning so the user understands why.

### **7.8.3 Lost device scenario**

If a device is lost:

* User can revoke it in device management.  
* Actions remain tied to the account and are visible on other devices.

---

## **7.9 Completion checklist for this chapter**

This chapter is complete when:

* Users can call back and the action is recorded.  
* Users can text back with approval-first and the message status is stored.  
* Users can add notes and see them across devices.  
* Users can set reminders and receive reminder notifications.  
* Users can block numbers and block behavior applies to future calls.  
* Labels can be corrected and spam marking works.  
* All actions attach to the call record and synchronize reliably.  
* Privacy mode and biometrics protect sensitive content during these actions.

# **Chapter 8: VIP list, block list, and spam control**

## **8.1 Purpose of this chapter**

This chapter defines how Phase 1 manages caller priority and unwanted calls. It covers three related capabilities:

1. VIP list, which ensures important people get better handling  
2. Block list, which prevents known unwanted callers from reaching the user  
3. Spam control, which helps identify and reduce low-value calls without breaking legitimate calls

These features directly impact user trust and willingness to pay. Users will keep the app if it reliably reduces spam and interruptions while never missing important calls.

---

## **8.2 Goals for Phase 1**

Phase 1 must achieve the following outcomes:

* Users can add and remove VIP callers easily.  
* VIP calls are treated differently in a predictable way.  
* Users can block callers and stop unwanted contact.  
* The system can label possible spam conservatively and suggest blocking.  
* Users can correct mistakes and override labels.  
* All list changes sync across devices immediately.  
* Privacy and security protections apply to these lists, since they reveal personal relationships.

---

## **8.3 VIP list in Phase 1**

### **8.3.1 What the VIP list is**

The VIP list is a user-managed list of phone numbers (and optional names) that represent high-priority callers. VIP behavior exists to reduce the chance of missing important calls and to make call handling feel smarter with minimal configuration.

VIP list entries are stored per user account. There is no shared VIP list across users unless explicitly designed later.

### **8.3.2 How users add VIPs**

Phase 1 should support at least two methods:

1. Manual entry  
* Add phone number  
* Add optional label, such as “Mom” or “Client A”  
2. Add from call history  
* From a call detail screen, user taps “Add to VIP”

If contact sync is supported later, it can be introduced as an additional method, but Phase 1 can remain simple with manual and call-based entry.

### **8.3.3 VIP behaviors controlled by settings**

VIP behavior must be understandable and configurable with simple toggles. Recommended settings:

**VIP handling**

* VIP calls are marked Important automatically  
* VIP calls can bypass strict screening, if enabled  
* VIP calls can allow longer max call duration, default 5 minutes  
* VIP calls can trigger stronger notifications, if enabled

**Live handoff for VIP**

* Off  
* VIP only  
* VIP and urgent

VIP behavior must never remove user control. It should improve visibility and routing options, not force automatic actions.

### **8.3.4 How the AI changes behavior for VIP calls**

When a call is from a VIP number, the AI should:

* Use a slightly more accommodating tone  
* Ask urgency earlier  
* Capture required fields quickly  
* Offer live handoff if enabled  
* Avoid unnecessary questions if the user enables simplified VIP screening

VIP calls should still be screened. The difference is speed and priority, not a completely different product.

### **8.3.5 VIP display in the app**

VIP status must be visible in:

* Call history list (VIP badge)  
* Call detail view (VIP label)  
* Filters (VIP filter, Important filter)

This helps users see the value immediately.

---

## **8.4 Block list in Phase 1**

### **8.4.1 What the block list is**

The block list is a user-managed list of phone numbers that the user does not want to reach the assistant line. Block list behavior must be reliable and must reduce noise.

Block list entries are stored per user account. A blocked number for one user must not affect another user.

### **8.4.2 How users add blocked numbers**

Phase 1 should support:

1. Block from call detail  
* A clear “Block number” button  
2. Manual block list entry  
* Add number in settings  
3. Block suggestion acceptance  
* If the system suggests blocking after repeated spam-like calls, the user can accept and the number is added

### **8.4.3 Blocked caller handling rules**

Phase 1 needs a consistent rule for what happens when a blocked caller tries to reach the assistant line. The behavior must be simple and not create new spam surfaces.

Recommended default behavior:

* The call ends quickly with a neutral message, or ends silently depending on product decision.  
* No call record is created by default.  
* No user notification is sent by default.

Optional settings:

* “Log blocked attempts” toggle  
* “Notify on blocked attempts” toggle

Most users will want blocked attempts to be invisible. The optional toggles are for advanced users.

### **8.4.4 Unblocking and auditability**

Users must be able to unblock a number at any time. When they do:

* The number is removed from the block list.  
* Future calls follow normal handling rules.  
* The app should store an event history entry for block and unblock actions.

---

## **8.5 Spam control in Phase 1**

### **8.5.1 What spam control is in Phase 1**

Spam control in Phase 1 is a lightweight system that labels suspicious calls conservatively and helps users reduce repeated unwanted contact. It is not a full reputation system and it should not automatically block unknown callers by default.

Spam control has three components:

1. Detection cues during the AI conversation  
2. Simple labels applied to the call record  
3. User actions to confirm, correct, or block

### **8.5.2 Spam related labels**

Phase 1 supports a small set of labels for filtering:

* Possible spam  
* Sales  
* Unknown  
* Normal call

These labels must be editable by the user.

### **8.5.3 Detection cues during calls**

Spam detection cues should be conservative to avoid false positives. Phase 1 can apply “Possible spam” when one or more of these are true:

* Caller refuses to provide name and reason  
* Caller repeats generic phrases without clarity  
* Caller is silent for long periods  
* The audio pattern appears like a prerecorded message  
* Caller repeatedly calls and immediately hangs up  
* The same unknown number triggers multiple low-content calls within a short time window

Phase 1 should treat these cues as soft signals, not as a reason to auto-block.

### **8.5.4 Sales detection and handling**

Sales calls are not always spam. Phase 1 should treat sales as a separate label because users often want to review sales requests later without being interrupted.

If the AI detects sales intent, it should:

* Ask for a one-sentence summary  
* Ask for callback number or email if available  
* End the call quickly  
* Label the call as Sales

This reduces time waste while still preserving useful information.

### **8.5.5 Repeat caller behavior**

Phase 1 should support a basic repeat caller rule:

* If a number calls multiple times within a short window and is not VIP, raise visibility.  
* If the content is low-quality and the pattern matches spam cues, suggest blocking.

Repeat caller logic must be transparent. The call detail can show a note such as “Repeated calls detected today” without adding complexity.

---

## **8.6 User controls and override behavior**

### **8.6.1 Mark as spam and correct labels**

Users must be able to correct system labels easily from call detail:

* Mark as spam  
* Not spam  
* Mark as sales  
* Mark as normal  
* Mark as unknown

When a user marks as spam:

* The system can suggest blocking.  
* The user chooses whether to block.

### **8.6.2 VIP and block actions from call detail**

Call detail must allow:

* Add to VIP  
* Remove from VIP  
* Block number  
* Unblock number

These actions must have clear confirmations for risky actions. Blocking should always require confirmation.

### **8.6.3 List management screens**

Phase 1 should include dedicated list screens:

* VIP list screen: view, search, add, remove  
* Block list screen: view, search, add, remove

Each entry should show:

* Number  
* Optional label  
* Last interaction date, if available

---

## **8.7 Settings required for this chapter**

### **8.7.1 VIP settings**

* VIP calls marked Important: On or Off  
* VIP max call length: default 5 minutes  
* VIP live handoff: Off, VIP only, VIP and urgent  
* VIP notification intensity: Normal or Strong

### **8.7.2 Block list settings**

* Blocked caller handling: end immediately or short neutral message  
* Log blocked attempts: On or Off  
* Notify on blocked attempts: On or Off

### **8.7.3 Spam control settings**

* Enable spam labeling: On or Off  
* Enable block suggestions: On or Off  
* Repeat caller threshold: simple choice such as 2, 3, 5 calls within a short window

These settings must be understandable. Avoid complex configuration in Phase 1\.

---

## **8.8 Data model requirements for lists and spam features**

Phase 1 must store:

* VIP entries:  
  * user\_id  
  * phone\_number  
  * label  
  * created\_at  
  * updated\_at  
* Block entries:  
  * user\_id  
  * phone\_number  
  * label  
  * created\_at  
  * updated\_at  
* Spam and label fields on call record:  
  * is\_vip  
  * spam\_label  
  * urgency\_label  
  * label\_reason fields, where applicable  
  * repeated\_call\_count or repeat indicators

The backend must ensure that all list access is scoped by user\_id. No cross-user lookup is permitted.

---

## **8.9 Security and privacy requirements for this chapter**

### **8.9.1 Sensitivity of VIP and block lists**

VIP and block lists reveal relationships and personal boundaries. They must be treated as sensitive:

* Protected behind authentication  
* Included in user data deletion rules  
* Not exposed in notifications unless user allows

If biometric protection is enabled for call content, list screens can optionally require biometric unlock as well. This can be offered as a security preference.

### **8.9.2 Abuse prevention**

Spam callers may try to exploit the assistant line. Phase 1 should include defensive controls:

* Rate limiting per caller number  
* Rate limiting per user number  
* Detection of repeated short calls  
* Automatic throttling for suspicious patterns

These controls should reduce cost and reduce disruption without blocking legitimate calls aggressively.

### **8.9.3 Audit logging**

Phase 1 should log these security-relevant events:

* VIP added or removed  
* Block added or removed  
* Spam label overridden by the user  
* Spam block suggestion accepted, if supported

Audit logs are used for debugging and future security review.

---

## **8.10 Failure behavior and edge cases**

### **8.10.1 False positives and false negatives**

Spam detection is imperfect. Phase 1 must handle this reality:

* False positives: user marks “Not spam” and can remove blocks easily.  
* False negatives: user can mark spam and block with one tap.

The UI must make correction easy because trust depends on it.

### **8.10.2 Caller ID changes and unknown numbers**

Some calls may not provide reliable caller ID. Phase 1 must:

* Still create call records  
* Mark as Unknown  
* Avoid automatic blocking decisions

### **8.10.3 International numbers and formatting**

Phone numbers should be stored in a standardized format. The UI should still display numbers in a friendly way.

Phase 1 must handle:

* Local and international formats  
* Leading zeros and country codes  
* Consistent matching for VIP and block logic

---

## **8.11 Completion checklist for this chapter**

This chapter is complete when:

* Users can add, remove, and view VIP entries.  
* VIP calls are labeled and treated as Important based on settings.  
* Users can block and unblock numbers.  
* Blocked callers are handled consistently with minimal noise.  
* Spam labeling works conservatively and is editable.  
* The system can suggest blocking for repeat spam patterns.  
* All list changes sync across devices.  
* VIP and block lists are protected as sensitive data and included in deletion rules.  
* Audit events exist for list and label changes.

# **Chapter 9: Live handoff and take-over controls**

## **9.1 Purpose of this chapter**

This chapter defines the Phase 1 feature that lets the user take over a live call after the AI answers it. This is called live handoff. It includes the user-facing settings, the on-call behavior, the mobile experience, and the backend control flow required to make the handoff reliable.

Live handoff is not required for the core value of Phase 1, but it is a major “love” feature when implemented well. It turns the assistant from a passive screener into an active gatekeeper that can escalate the right calls at the right time.

---

## **9.2 Goals for Phase 1**

Live handoff must achieve these outcomes:

* The AI can answer and screen as normal.  
* If a call meets the user’s rules, the user can be prompted to take the call.  
* The user can accept the call with one tap.  
* If the user does nothing, the AI continues and completes screening.  
* The system records what happened, including whether handoff was offered and accepted.  
* The feature is controlled entirely by user settings and respects privacy mode.

---

## **9.3 Definitions and concepts**

### **9.3.1 What “live handoff” means**

Live handoff means the user can join the call while the AI is still on the line, and the call is routed to the user’s phone so the user can speak directly with the caller.

### **9.3.2 What “take-over” means**

Take-over is the user action of accepting the handoff prompt. The user taps a button like “Take call now” and the system connects them.

### **9.3.3 What “handoff eligible” means**

A call is handoff eligible only if the user has enabled it and the call matches the selected rule set, such as VIP or Urgent.

---

## **9.4 Live handoff settings in Phase 1**

### **9.4.1 Primary toggle**

The app must provide a clear main setting:

* Live handoff: Off or On

If Off, no handoff prompts are generated.

### **9.4.2 Rule selection**

If On, the user selects when handoff is allowed:

* VIP only  
* Urgent only  
* VIP and Urgent

These are simple and understandable.

### **9.4.3 Handoff timing preference**

Phase 1 should support one simple timing rule:

* Prompt after minimum screening data is captured

Minimum screening data is defined as:

* Caller name or identifier  
* One-line reason for calling

This avoids prompting the user with zero context.

### **9.4.4 Handoff timeout**

Phase 1 should support a simple timeout window:

* If the user does not respond within X seconds, handoff expires and the AI continues screening.

The default should be long enough to react but short enough to matter, for example 15 to 25 seconds.

### **9.4.5 Privacy mode interaction**

If the user uses private notification mode:

* The handoff prompt must not show caller reason or transcript preview on the lock screen.  
* It can show a generic message like “Call takeover available”.

If preview mode is enabled:

* It may show caller name or number and a one-line reason snippet.

### **9.4.6 Device selection behavior**

If the user has multiple devices, Phase 1 must choose predictable behavior:

* All devices receive the handoff prompt.  
* Only one device can successfully accept the handoff.  
* If two devices attempt to accept, the first valid acceptance wins and the other shows “Already answered on another device.”

This avoids confusion and prevents duplicate routing attempts.

---

## **9.5 User experience during a live handoff**

### **9.5.1 What the user sees**

When a call becomes handoff eligible, the user receives:

* A push notification, if enabled  
* An in-app banner if the app is open

The prompt should show:

* Caller identity (name or number)  
* One-line reason  
* Urgency badge  
* Buttons:  
  * Take call now  
  * Ignore

If privacy mode blocks preview, the prompt only shows:

* “Call takeover available”  
* Buttons:  
  * Take call now  
  * Ignore

### **9.5.2 What happens when the user taps “Take call now”**

The user expects immediate results. Phase 1 must ensure:

1. The system attempts to connect the user to the call immediately.  
2. The app shows a connecting state.  
3. If connection succeeds, the user speaks with the caller.  
4. The AI stops speaking and exits the call path cleanly.

The app must update the call record to reflect that handoff occurred.

### **9.5.3 What happens when the user taps “Ignore”**

If the user ignores the handoff prompt:

* The AI continues screening normally.  
* A call record is still created at the end.

The call record should still show:

* Handoff offered: Yes  
* Handoff accepted: No

### **9.5.4 What happens if the user does nothing**

If the user does nothing:

* The AI continues screening after the timeout.  
* The call record shows that handoff expired.

This must feel smooth and should not interrupt the caller experience.

---

## **9.6 AI behavior during handoff**

### **9.6.1 Minimum screening requirement**

Before triggering handoff, the AI should try to capture:

* Caller name or identifier  
* Reason for calling  
* Urgency if the call feels urgent

This gives the user enough context to decide.

### **9.6.2 Behavior while waiting for user response**

While waiting for the handoff window, the AI should keep the call stable and avoid long dialogue. The AI can say:

* “One moment please, I’m checking if Kat can take this.”

Then:

* Continue asking one short question if needed, such as urgency or callback time, but avoid deep conversation.

### **9.6.3 Behavior after acceptance**

If handoff is accepted:

* The AI stops speaking immediately.  
* The AI ends its role on the call.  
* The system transitions to user-to-caller conversation.

### **9.6.4 Behavior if connection fails**

If the attempt to connect the user fails:

* The AI must resume screening immediately.  
* The caller should not be left in silence.  
* The user should receive a clear message that the takeover failed.

The call record should show:

* Handoff offered: Yes  
* Handoff accepted: Attempted  
* Handoff result: Failed

---

## **9.7 Backend flow for live handoff**

### **9.7.1 Eligibility evaluation**

The backend determines eligibility using:

* Caller number match against VIP list  
* Urgency label and its triggers  
* User live handoff settings

Eligibility is evaluated during the call, not only after it ends.

### **9.7.2 Prompt dispatch**

When eligible:

* Send a handoff prompt event to the notification system.  
* If the app is open, send a real-time in-app event as well.

The event includes:

* call\_id  
* user\_id  
* caller display  
* reason snippet if allowed by privacy mode  
* urgency label

### **9.7.3 Acceptance handling**

When a device accepts:

* Backend verifies:  
  * The call is still active  
  * Handoff is still available  
  * The user session is valid  
  * The device is authorized for the account  
* Backend performs the connect action to route the call to the user.  
* Backend marks the handoff state so other devices cannot accept again.

### **9.7.4 State transitions stored in call record**

The call record must store the handoff timeline:

* handoff\_offered\_at timestamp  
* handoff\_offer\_reason (VIP, urgent, both)  
* handoff\_accepted\_at timestamp, if accepted  
* handoff\_accepted\_device\_id, if accepted  
* handoff\_result (success, failed, expired, ignored)

These fields support debugging and user trust.

---

## **9.8 Edge cases and failure behavior**

### **9.8.1 User is unreachable**

If the user cannot be reached or does not answer the connect attempt:

* Resume AI screening immediately.  
* Store the failure in the call record.

### **9.8.2 User accepts too late**

If the user taps after timeout:

* App shows “Too late to take this call.”  
* The call continues with AI screening and the user can call back later.

### **9.8.3 Caller hangs up during handoff**

If the caller hangs up while the handoff prompt is active:

* Cancel the handoff state.  
* Create a call record with partial data.  
* Notify the user that the caller ended the call.

### **9.8.4 Multiple device race condition**

If multiple devices try to accept:

* First successful acceptance wins.  
* Other devices show “Already answered on another device.”  
* The backend prevents multiple connections.

### **9.8.5 Privacy mode conflicts**

If privacy mode is private:

* The system must not reveal call reason in notifications.  
* The app can show details only after the user opens the app and passes biometric checks if enabled.

---

## **9.9 Security and privacy requirements for live handoff**

### **9.9.1 Authentication and authorization checks**

Before executing a takeover:

* The user must be authenticated.  
* The device must belong to the user account.  
* The call must belong to that user’s routing configuration.

This prevents one user from taking another user’s calls.

### **9.9.2 Biometric interaction**

Biometrics protect call content. Live handoff is a call action, but the app still must not leak sensitive content in the prompt if privacy mode is private.

If the user opens the call detail from the handoff prompt:

* Biometric gating applies before transcript or recordings are shown.

### **9.9.3 Audit logging**

Phase 1 must record audit events for:

* Handoff offered  
* Handoff accepted  
* Handoff failed  
* Device that accepted

This supports debugging and incident review.

### **9.9.4 Abuse prevention**

Handoff can be abused by repeated callers to force attention. Phase 1 should support:

* VIP-only handoff as a safe default  
* Optional rate limits, such as:  
  * Limit handoff prompts from the same non-VIP number within a short period

---

## **9.10 Testing and verification requirements**

### **9.10.1 Functional test scenarios**

Phase 1 must test at least:

* VIP call triggers handoff, user accepts, success  
* Urgent call triggers handoff, user ignores, AI completes screening  
* Handoff prompt times out, AI continues  
* User tries to accept after timeout, blocked  
* Caller hangs up during prompt, call record created with partial data  
* Multiple devices receive prompt, only one can accept

### **9.10.2 Privacy mode test scenarios**

* Private mode: no reason snippet appears on lock screen  
* Preview mode: reason snippet appears as configured  
* Biometric required before viewing transcript and recordings

### **9.10.3 Reliability expectations**

The handoff prompt must arrive quickly enough to matter. If it consistently arrives late, the feature will feel broken even if it technically works.

---

## **9.11 Completion checklist for this chapter**

This chapter is complete when:

* Users can enable live handoff and choose VIP and urgency rules.  
* Handoff prompts appear only for eligible calls.  
* Prompts respect privacy mode and do not leak sensitive content.  
* Users can accept handoff on one device and successfully connect.  
* If the user ignores or times out, the AI completes screening normally.  
* All handoff events are stored in the call record reliably.  
* Multi-device behavior is consistent and safe.  
* Edge cases and failure paths do not drop calls silently.

# **Chapter 10: Personalization settings**

## **10.1 Purpose of this chapter**

This chapter defines the end-user personalization controls available in Phase 1\. Personalization is a core requirement of the Mattbot Project because the agent must feel like it belongs to the user. At the same time, Phase 1 must keep personalization simple and safe, with presets and clear toggles rather than complex configuration.

Phase 1 personalization has two goals:

1. Make the assistant feel personal: voice, tone, style, boundaries  
2. Make the assistant behave correctly for the user’s life: business hours, VIP handling, approval rules, privacy

The same personalization system must be designed to expand into Phase B and Phase C, where it will control how the agent writes emails, drafts messages, and summarizes reading content.

---

## **10.2 Personalization principles for Phase 1**

Phase 1 must follow these principles:

* Simple controls: presets and toggles, not complex sliders.  
* Predictable behavior: user should understand what a setting changes.  
* Safe defaults: privacy-first and approval-first by default.  
* Consistent application: the same settings affect every call reliably.  
* Expandable design: Phase B and C can reuse the same settings framework.

---

## **10.3 Personalization categories in Phase 1**

Phase 1 settings should be organized into categories so users do not get lost:

1. Assistant identity and voice  
2. Temperament and language style  
3. Call handling behavior  
4. Availability rules (business hours, quiet hours)  
5. Lists and priority rules (VIP, block, spam)  
6. Outbound approval rules (texting back)  
7. Privacy and security controls (biometrics, notification previews, recordings)

This chapter focuses on personalization as a product feature. Privacy and security are referenced but detailed deeply in the security chapter.

---

## **10.4 Assistant identity and voice**

### **10.4.1 Assistant name**

Phase 1 should allow the user to choose an assistant name, such as “Alex” or “Mia”.

The assistant name is used in:

* The greeting during calls  
* The call transcript header  
* Optional notification text if preview mode is enabled

The assistant name must never imply that it is the user. It is always an assistant for the user.

### **10.4.2 Voice selection**

Phase 1 must include a voice selection screen that offers:

* A set of prebuilt voice options  
* A short preview audio sample for each voice  
* The ability to apply the selected voice immediately for future calls

Voice selection should be fast and stable. Users should not need technical knowledge to pick a voice.

### **10.4.3 Voice behavior consistency rules**

Once selected, the voice must:

* Remain consistent across calls  
* Not change randomly  
* Not sound dramatically different across devices

If voice services have temporary issues, the system should have a fallback voice that preserves clarity and professionalism.

### **10.4.4 “User’s voice” option**

The full “user’s voice” feature is a major product driver, but it adds complexity and risk. In Phase 1, this should be treated as:

* A configurable placeholder in the UI that can exist even if the capability is gated  
* A controlled onboarding path if enabled

If included in Phase 1, it must require:

* Clear user consent  
* Verification steps to reduce misuse  
* A way for the user to disable it instantly

If not included in Phase 1, the system should still store the user preference so the feature can be added later without changing the settings model.

---

## **10.5 Temperament and language style**

### **10.5.1 What temperament controls**

Temperament controls the assistant’s conversational style. In Phase 1, it applies to phone calls only, but it must be designed to reuse for Phase B and C.

Temperament controls:

* Formal vs casual language  
* Humor level  
* Directness vs friendliness  
* Swearing rules  
* Accent preference, if supported by the selected voice  
* Response length preference, such as short vs detailed

### **10.5.2 Preset approach**

Phase 1 should offer a small number of temperament presets, such as:

* Professional and polite  
* Friendly and casual  
* Short and direct  
* Warm and supportive

Each preset must include a plain-language description of what it does.

### **10.5.3 Swearing and language boundaries**

Swearing controls must be explicit, because it affects brand trust and caller experience.

Phase 1 should offer:

* No swearing  
* Mild swearing  
* Allow swearing

The default should be no swearing.

Even if swearing is allowed, the assistant must not use hateful or abusive language. The assistant must remain respectful.

### **10.5.4 Accent preferences**

Accent preferences should be treated as a best-effort setting:

* If supported by the voice system, apply it.  
* If not supported, do not fail the call.  
* The UI should not promise perfect accent control if the underlying voice system cannot guarantee it.

### **10.5.5 Language selection**

If multi-language support is planned, Phase 1 should store:

* Primary language  
* Secondary language, optional

If multi-language support is not included in Phase 1, the system should still store the preference to avoid future migrations.

---

## **10.6 Call handling behavior settings**

### **10.6.1 Greeting templates**

The assistant greeting must be configurable by templates, not free text, to reduce risk and keep behavior consistent.

Phase 1 includes:

* A small set of greeting templates  
* Optional user customization by selecting a template and editing limited fields, such as assistant name

Greeting templates should support:

* Standard greeting  
* After-hours greeting  
* VIP greeting

### **10.6.2 Call objective settings**

Phase 1 should allow the user to choose how the assistant behaves:

* Screen and summarize (default)  
* Take a message only (shorter, less conversation)

This is useful for users who want strict voicemail style.

### **10.6.3 Maximum call length**

Phase 1 should let the user choose a max call length with simple options:

* 2 minutes  
* 3 minutes (default)  
* 5 minutes

VIP calls can have a separate max call length, such as:

* 3 minutes  
* 5 minutes (default)

This prevents long calls and controls cost.

### **10.6.4 Handoff settings link**

Live handoff settings must be accessible from personalization settings and must be explained clearly:

* Off  
* VIP only  
* Urgent only  
* VIP and urgent

---

## **10.7 Availability rules**

### **10.7.1 Business hours**

Business hours define how the assistant behaves based on time of day. Phase 1 must include:

* Start time  
* End time  
* Days of week  
* After-hours behavior

After-hours behavior options:

* Screen normally  
* Take message only  
* Screen and mark low priority by default

VIP and urgent rules can override after-hours low priority.

### **10.7.2 Quiet hours**

Quiet hours define how notifications behave, not whether calls are answered.

Quiet hours include:

* Start time  
* End time  
* Days of week  
* Notification behavior during quiet hours:  
  * Silent for normal calls  
  * Normal alert for Important calls only

---

## **10.8 Lists and priority rules**

### **10.8.1 VIP list controls**

Settings must allow:

* VIP management  
* VIP call handling preferences  
* VIP notification intensity

### **10.8.2 Block list controls**

Settings must allow:

* Block list management  
* Blocked caller behavior  
* Optional logging and notification for blocked attempts

### **10.8.3 Spam control settings**

Settings must allow:

* Enable spam labeling  
* Enable block suggestions  
* Repeat caller thresholds

These settings should be conservative by default.

---

## **10.9 Outbound approval rules for texting back**

### **10.9.1 Default approval-first**

Phase 1 must be approval-first by default for all outbound texts. This is a trust and safety requirement and reduces risk.

### **10.9.2 Limited exceptions**

If Phase 1 supports exceptions, they must be simple and restricted, such as:

* Auto-allow texts for VIP callers only

Even in VIP auto-allow, the system should still show the user what was sent in the call record.

### **10.9.3 Template use and edit behavior**

Users should be able to:

* Select a template  
* Edit before sending  
* Save frequently used templates if included

Templates reduce unpredictable messaging and improve user trust.

---

## **10.10 Privacy and security related personalization**

Phase 1 personalization must link to privacy controls clearly because personal communication content is sensitive.

Settings include:

* Biometric unlock required  
* Notification preview mode: private or preview  
* Recordings: on or off  
* Data retention duration  
* Memory: on or off, and deletion controls

The detailed requirements for these settings are defined in the Security and Privacy chapter.

---

## **10.11 Data model requirements for personalization**

Phase 1 must store personalization as structured fields per user account, not as loose text. The settings model should be:

* Versioned so new settings can be added later  
* Backward compatible so older app versions do not break  
* Auditable for sensitive settings changes

At minimum, store:

* Assistant name  
* Voice selection ID  
* Temperament preset ID  
* Swearing rule level  
* Business hours schedule  
* Quiet hours schedule  
* Call length limits  
* Live handoff rule  
* Dedicated number access policy  
* Text approval rule  
* Notification privacy mode  
* Recording preference  
* Retention preference  
* Memory preference

---

## **10.12 User experience requirements for settings**

Phase 1 settings must be:

* Organized into clear groups  
* Explaining what each setting does in plain language  
* Showing defaults and recommended values  
* Providing immediate feedback after changes  
* Synchronizing changes across devices quickly

Users must never wonder whether a setting change applied.

---

## **10.13 Completion checklist for this chapter**

This chapter is complete when:

* Users can set assistant name, voice, and temperament preset.  
* Users can control greeting templates, call style, and call length.  
* Users can configure business hours and quiet hours.  
* Users can control VIP, block, and spam settings.  
* Users can control approval-first rules for texting back.  
* Settings sync reliably across devices.  
* The system stores settings in a structured, versioned model that can expand in Phase B and C without redesign.

# **Chapter 11: Memory, retention, and user control**

## **11.1 Purpose of this chapter**

This chapter defines what “memory” means in Phase 1, how long data is kept, and how the user controls what is stored and what is deleted. This is critical because Phase 1 handles personal communications that may contain sensitive information.

Phase 1 must treat user control as a product requirement, not a legal checkbox. Users must be able to understand what the app remembers, why it remembers it, and how to remove it.

This chapter covers three areas:

1. Memory: what the assistant can remember  
2. Retention: how long call data is stored  
3. User controls: how users view, delete, and manage stored data

---

## **11.2 Definitions used in Phase 1**

### **11.2.1 Call data**

Call data includes anything generated or stored from a call, such as:

* Call metadata (time, duration, source mode)  
* Caller identity fields (name, number)  
* Transcript  
* Summary  
* Labels (urgency, spam, VIP)  
* Notes  
* Reminders  
* Optional recordings

### **11.2.2 Memory data**

Memory data is information stored beyond a single call to improve future experiences. In Phase 1, memory must remain small and controlled, focused on preference-style data, not building a complex personal profile.

Examples of Phase 1 memory:

* “This caller prefers morning callbacks”  
* “This caller is usually about billing”  
* “User prefers short summaries”  
* “User wants no swearing”

### **11.2.3 Retention window**

Retention window is the period the system keeps call data before automatic deletion. Retention must apply consistently across summaries, transcripts, and recordings.

---

## **11.3 Memory scope for Phase 1 (light memory only)**

### **11.3.1 What Phase 1 memory is allowed to store**

Phase 1 memory should be limited to:

**Caller preference memory**

* Preferred callback time  
* Preferred contact method if provided  
* Name corrections or pronunciation notes if captured  
* Typical reason patterns, in a simple label form

**User preference memory**

* Summary style preference (short vs detailed)  
* Temperament preference presets  
* Greeting preferences  
* Approval-first preference (still default on)  
* Notification privacy preference

**Workflow memory**

* Frequently used reply templates  
* Preferred follow-up behavior such as “always set a reminder for urgent calls,” if implemented later

This memory exists to reduce repeated effort, not to build an invasive system.

### **11.3.2 What Phase 1 memory must not store**

Phase 1 must not store broad or hidden memory, such as:

* Full behavioral profiles of the user  
* Private personal life details inferred from calls  
* Sensitive categories as permanent memory by default  
* Automatically “learning everything” from transcripts without visibility

Phase 1 should avoid any behavior that could surprise users.

### **11.3.3 Memory visibility requirement**

If memory exists, it must be visible to the user. Phase 1 requires a memory page where users can:

* View memory items  
* Search memory items  
* Delete individual memory items  
* Delete all memory

If a memory feature cannot be made visible and deletable, it should not be shipped.

---

## **11.4 Memory creation rules**

### **11.4.1 Explicit vs implicit memory**

Phase 1 can support two approaches:

**Approach A: Explicit memory only**

* Memory is created only when the user taps “Remember this”  
* Highest trust, lowest risk

**Approach B: Light implicit memory with visibility**

* Memory can be created automatically for safe categories  
* Examples: “caller prefers morning callbacks”  
* Every created memory item appears in the memory page  
* User can delete at any time

For Phase 1, Approach B can be acceptable if kept conservative and transparent. If the product wants strict privacy, Approach A is safer.

### **11.4.2 Memory categories allowed for implicit creation**

If implicit memory is used, Phase 1 should only allow it for:

* Callback time preference  
* Caller name correction  
* Template usage frequency  
* User summary length preference

Everything else should require explicit user action.

### **11.4.3 Linking memory items to sources**

Memory items should reference their source, such as:

* “From call on 2026-02-02”  
  This improves user trust because the user can see where it came from.

---

## **11.5 Retention requirements for Phase 1**

### **11.5.1 Default retention**

Phase 1 must define a default retention duration. A safe default is 30 days because it balances usefulness with privacy, but the exact default can be set based on product policy.

Users must be able to change retention in settings.

### **11.5.2 Retention options**

Phase 1 should provide simple options:

* 7 days  
* 30 days  
* 90 days

If a user chooses longer, the UI should explain that longer retention increases privacy risk.

### **11.5.3 What retention applies to**

Retention must apply to:

* Summaries  
* Transcripts  
* Recordings if enabled  
* Notes  
* Follow-up action history  
* Call-linked reminders  
* Any call-linked memory source references

Retention must not delete only part of a call record. Partial deletion creates confusion and can break trust.

### **11.5.4 Automatic deletion behavior**

When retention expires:

* Call record is deleted fully  
* Recording data is deleted fully  
* Any derived call-linked content is deleted, unless it was intentionally stored as a separate memory item

If a memory item was created from a call, it should remain only if:

* The memory item is still visible in the memory page  
* The user has not deleted it  
* The memory system supports independent retention rules

If independent retention is too complex, Phase 1 can choose a simpler policy:

* Memory items expire with call retention unless explicitly saved

---

## **11.6 User deletion controls**

### **11.6.1 Delete a single call record**

The user must be able to delete a call record from call detail.

When deleted, the system must remove:

* Summary  
* Transcript  
* Recording if any  
* Notes  
* Follow-up action history  
* Any reminders attached to that call

The app must ask for confirmation to prevent accidental deletion.

### **11.6.2 Delete all call data**

Phase 1 must support a “Delete all call data” action.

This must:

* Explain what will be deleted  
* Require a stronger confirmation step  
* Remove all call records and related content  
* Clear all local cached copies on devices

### **11.6.3 Delete account**

Deleting an account must:

* Delete call data  
* Delete memory items  
* Delete settings  
* Revoke devices and sessions  
* Remove phone number mappings

Account deletion must be explicit and not reversible.

---

## **11.7 Memory management controls**

### **11.7.1 Memory page requirements**

Phase 1 must include a memory page that shows:

* List of memory items  
* Type category, such as caller preference or user preference  
* Associated caller or context  
* Created date  
* Optional source call link

The user can:

* Delete one memory item  
* Delete all memory items  
* Turn memory off

### **11.7.2 What happens when memory is turned off**

If memory is turned off:

* No new memory items are created  
* Existing memory items are either:  
  * Kept but inactive, or  
  * Deleted immediately, depending on product policy

For Phase 1, the safer, clearer behavior is:

* Offer the user a choice:  
  * Turn off and keep existing memory  
  * Turn off and delete all memory now

### **11.7.3 Memory scope clarity**

The app must explain memory in plain language:

* What is remembered  
* Why it is remembered  
* How to delete it

This explanation should appear in onboarding and settings.

---

## **11.8 Local storage and caching rules**

### **11.8.1 Why caching exists**

Mobile apps often cache data for speed. In Phase 1, caching must be treated as part of data retention and privacy.

### **11.8.2 What can be cached**

Phase 1 can cache:

* Call list entries  
* Summary text  
* Minimal metadata for speed

Sensitive content like full transcripts and recordings should be cached only if:

* Encrypted at rest on device  
* Protected by biometrics  
* Cleared when user logs out or removes device

### **11.8.3 Clearing local cache**

The app must clear cached sensitive data when:

* User logs out  
* Device is revoked  
* User deletes call data or deletes account

This prevents leftover data from remaining on old devices.

---

## **11.9 Security and privacy requirements in this chapter**

### **11.9.1 Minimum control guarantees**

Phase 1 must guarantee:

* Users can see what is stored  
* Users can delete stored data  
* Deletion actually removes data, including derived content where applicable  
* Settings changes apply quickly across devices

### **11.9.2 Audit events for deletion and memory changes**

Phase 1 must record audit events for:

* Call record deletion  
* Delete all call data  
* Memory item created  
* Memory item deleted  
* Memory turned on or off  
* Retention setting changed

Audit logs support debugging and security review.

### **11.9.3 Preventing silent retention growth**

Phase 1 must avoid “hidden storage” where older call data remains stored due to failures. Retention deletion jobs must be monitored and verified.

---

## **11.10 Completion checklist for this chapter**

This chapter is complete when:

* Memory is defined as light, preference-based only.  
* The app includes a memory page where items are visible and deletable.  
* Memory can be turned on or off with clear behavior.  
* Retention options exist and apply to all call record content consistently.  
* Users can delete single calls, delete all call data, and delete their account.  
* Local cached sensitive data is encrypted, protected, and cleared correctly.  
* Retention deletion is reliable and monitored.  
* Audit events exist for retention, deletion, and memory changes.

# **Chapter 12: Security and privacy**

## **12.1 Purpose of this chapter**

This chapter defines the security and privacy requirements for Phase 1 of the Mattbot Project. Phase 1 processes personal communications, which can include private information about the user and callers. Security and privacy are therefore not optional features. They are core product behavior that must be built into the mobile app, backend brain, data storage, and operational processes.

This chapter focuses on what must be protected, the threats the system must assume, and the controls that Phase 1 must implement to reduce risk in a practical way.

---

## **12.2 Security and privacy goals for Phase 1**

Phase 1 must achieve these outcomes:

* Only the correct user can access their call records, transcripts, and recordings.  
* Sensitive content is protected on the device and on the server.  
* Notification content does not leak sensitive information by default.  
* Users can delete data and deletion is real and complete.  
* The system prevents abuse, such as spam callers or automated attacks against public endpoints.  
* The product includes enough auditability and monitoring to detect and investigate issues.

---

## **12.3 What data Phase 1 handles and why it is sensitive**

Phase 1 stores or processes the following data categories:

### **12.3.1 Identity and account data**

* User account identity and authentication data  
* Device identifiers and device session information

This is sensitive because it controls access to everything else.

### **12.3.2 Call content data**

* Call summaries  
* Call transcripts  
* Optional call recordings

This is sensitive because it can include personal information, business conversations, and private requests.

### **12.3.3 Caller information**

* Caller phone number  
* Caller-provided name  
* Callback number  
* Company or relationship if provided

This is sensitive because it reveals the user’s network and contacts.

### **12.3.4 User settings and preferences**

* Voice choice and temperament preferences  
* Business hours and quiet hours  
* VIP list and block list  
* Approval rules for texting back  
* Retention and memory settings

This is sensitive because it reveals behavior patterns and relationships.

### **12.3.5 Operational metadata**

* Call timestamps and durations  
* Routing source (dedicated vs forwarded)  
* Label reasons and handoff events

This is sensitive because it can be used to infer user availability and habits.

---

## **12.4 Threat model in plain language**

Phase 1 must assume at least these realistic threats:

### **12.4.1 Unauthorized account access**

Someone gains access to a user account and views private transcripts or recordings.

Common paths:

* Stolen phone  
* Weak password reuse  
* Session token theft  
* Social engineering

### **12.4.2 Cross-user data exposure**

A bug or misconfiguration lets one user see another user’s data.

This is one of the most severe risks in multi-user systems.

### **12.4.3 Sensitive data leakage on device**

Transcripts or recordings remain accessible on a device after logout, device revoke, or deletion.

### **12.4.4 Sensitive data leakage through notifications**

Lock screen previews can expose caller names, reasons, or message content to anyone who sees the phone.

### **12.4.5 Abuse of public call endpoints**

Dedicated AI numbers can be attacked by spam callers, robocalls, or automated call floods that cause:

* Cost spikes  
* Service instability  
* Poor user experience

### **12.4.6 Data retention creep**

Data remains stored longer than intended because retention deletion fails silently.

### **12.4.7 Vendor risk**

Phase 1 depends on external vendors for telephony and AI processing. Data may pass through third-party systems. This requires careful scoping and safe defaults.

---

## **12.5 Access control requirements**

### **12.5.1 Authentication**

Phase 1 must use strong authentication for user access. The minimum requirements are:

* Secure login mechanism  
* Session tokens that expire and refresh securely  
* Protection against brute force attempts through rate limiting

The app must support sign out and sign out all devices.

### **12.5.2 Authorization and data isolation**

All backend reads and writes must be scoped by user identity. The backend must enforce:

* A user can only access call records linked to their user\_id  
* A user can only access settings linked to their user\_id  
* VIP and block lists are per-user, never shared by default

This must be enforced at the backend level, not only in the mobile app UI.

### **12.5.3 Device trust and revocation**

Phase 1 must support device revocation. When a device is revoked:

* Its session must become invalid immediately  
* The app must lose access on that device  
* Cached sensitive content must be cleared

Device management is a security control, not a convenience feature.

---

## **12.6 Data protection requirements**

### **12.6.1 Data in transit**

All data between the app and backend must be encrypted in transit. This is non-negotiable.

### **12.6.2 Data at rest on the server**

All sensitive stored data must be encrypted at rest, including:

* Transcripts  
* Summaries  
* Caller details  
* VIP and block lists  
* Recordings if stored

Encryption at rest must be paired with access control. Encryption alone does not prevent misuse if keys are mismanaged, so Phase 1 must also limit who and what services can access decrypted data.

### **12.6.3 Data at rest on the device**

If the app caches sensitive content:

* It must be stored encrypted.  
* It must be protected behind the same biometric policy used for viewing.  
* It must be cleared on logout, device revoke, and account deletion.

Phase 1 should prefer minimal caching for transcripts and recordings unless required for usability.

---

## **12.7 Biometric protection requirements**

### **12.7.1 What is protected by biometrics**

Biometrics must protect:

* Call transcripts  
* Recording playback  
* Any sensitive call detail fields based on policy

The call list can remain visible in a limited way if privacy mode is enabled, but content access should require biometric unlock.

### **12.7.2 Lock timing rules**

Phase 1 must support a simple lock timing rule, such as:

* Lock immediately on app close, or  
* Lock after X minutes of inactivity

The product should choose a default that favors privacy but does not annoy users.

### **12.7.3 Biometric failure behavior**

If biometrics fail:

* Use the device’s secure fallback method  
* Do not bypass protection

---

## **12.8 Notification privacy requirements**

### **12.8.1 Private mode default**

Phase 1 must default to a private notification mode where lock screen notifications do not reveal:

* Caller reason  
* Transcript text  
* Sensitive details

The safest default notification is:

* “New call screened”  
* “Important call screened”

### **12.8.2 Preview mode as user choice**

Users can enable preview mode if they want. Preview mode may show:

* Caller name or number  
* One-line reason snippet  
* Urgency badge

Preview mode must be clearly labeled as less private.

### **12.8.3 Quiet hours interaction**

Quiet hours must exist to reduce risk of private content appearing loudly at night. Quiet hours should:

* Silence normal calls  
* Allow stronger alerts for Important calls if user chooses

---

## **12.9 Recording and consent requirements**

### **12.9.1 Recording defaults**

Call recording must be off by default.

If the user enables recordings:

* The setting must be clear and explicit.  
* The app must explain that recording can have legal requirements depending on location.

### **12.9.2 Recording access control**

If recordings exist:

* Protect playback behind biometrics.  
* Respect retention and deletion policies.  
* Avoid exposing raw recording links without authentication.

### **12.9.3 Recording retention and deletion**

Recording data must follow the same retention window as the call record. When a call record is deleted or retention expires:

* The recording must be deleted too.

---

## **12.10 Retention and deletion security requirements**

### **12.10.1 Retention enforcement**

Phase 1 must enforce retention consistently and automatically. It must not rely on users to clean up data manually.

Retention must cover:

* Call summaries  
* Transcripts  
* Recordings  
* Notes  
* Action history  
* Linked reminders

### **12.10.2 Verified deletion**

Deletion must be real. Phase 1 must ensure that when users delete:

* The server copy is removed  
* Derived artifacts are removed  
* Device caches are cleared on next sync  
* Deleted content cannot be accessed again

### **12.10.3 Preventing retention failures**

Retention deletion jobs must be monitored. If a deletion job fails:

* It must alert operators  
* It must retry  
* It must not silently accumulate data

---

## **12.11 Abuse prevention and rate limiting**

### **12.11.1 Caller abuse controls**

Dedicated numbers can be targeted. Phase 1 must include:

* Rate limiting per caller number  
* Rate limiting per user number  
* Basic flood detection

### **12.11.2 API abuse controls**

Backend APIs must include:

* Rate limiting per account  
* Protection against brute force login attempts  
* Request validation and input sanitization

### **12.11.3 Cost protection**

Because calls and AI processing create direct costs, Phase 1 should include:

* Usage caps or throttles per user plan  
* Alerts when unusual activity occurs  
* Basic anti-fraud detection patterns

Even if billing is not launched, cost protection prevents financial risk during early deployments.

---

## **12.12 Audit logging and monitoring**

### **12.12.1 Audit events required**

Phase 1 must record audit events for:

* Login and logout  
* Device added and removed  
* Settings changes for privacy critical settings:  
  * notification privacy mode  
  * recording on or off  
  * retention changes  
  * memory on or off  
  * live handoff rules  
* Data deletion:  
  * delete call record  
  * delete all call data  
  * delete account  
* Outbound actions:  
  * text sent  
* Handoff events:  
  * offered, accepted, failed, expired

Audit logs must not expose full transcript content in logs.

### **12.12.2 Monitoring requirements**

Phase 1 must include monitoring for:

* Call success rate  
* Transcript success rate  
* Summary generation success rate  
* Notification delivery success  
* Retention deletion job success  
* Error rates by endpoint

Monitoring should support rapid detection of systemic failures.

---

## **12.13 Secure development practices for Phase 1**

Phase 1 must follow basic secure engineering practices:

* Separate environments: dev, staging, production  
* Secret management for API keys  
* Least privilege access for services and databases  
* Input validation at API boundaries  
* Dependency vulnerability awareness and patching process  
* No sensitive data in plaintext logs

---

## **12.14 Security requirements that enable Phase B and Phase C**

Phase B and C will increase the sensitivity of data and permissions. Phase 1 must establish:

* A permissions model that can expand to email and social channels  
* A safe approval framework for outbound actions  
* A consistent memory and deletion framework  
* A clear audit trail system

Without these, later phases become risky or require rewrites.

---

## **12.15 Completion checklist for this chapter**

This chapter is complete when:

* Authentication, authorization, and per-user data isolation are enforced on the backend.  
* Device revocation works and clears cached sensitive data.  
* Data is protected in transit and at rest.  
* Biometrics protect transcripts and recordings.  
* Notification privacy mode exists and defaults to private.  
* Recording is off by default and protected behind biometrics if enabled.  
* Retention and deletion are consistent and verified.  
* Rate limiting and abuse controls exist for calls and APIs.  
* Audit logging covers major security events without leaking call content.  
* Monitoring exists for core reliability and retention deletion jobs.

# **Chapter 13: Technical blueprint (high level)**

## **13.1 Purpose of this chapter**

This chapter describes the Phase 1 technical blueprint at a high level. It explains the major system parts, how they connect, and how data flows end to end. The goal is to give a clear system map that is detailed enough for engineering planning, but still understandable to non-technical readers.

Phase 1 includes:

* A mobile app  
* A backend brain  
* Telephony connectivity for inbound calls  
* AI services for conversation, transcription, and summarization  
* Notification delivery  
* Secure storage for sensitive call data

---

## **13.2 System overview**

Phase 1 is built as a set of cooperating components:

1. **Mobile App**  
   Used by the end user to configure the assistant, view call records, and take actions.  
2. **Backend Brain**  
   The core system that manages users, settings, call routing, conversation handling, summaries, transcripts, actions, and security.  
3. **Telephony Provider Integration**  
   Receives inbound calls, connects audio streams, and enables call forwarding and dedicated numbers.  
4. **AI Pipeline**  
   Processes call audio into text and produces summaries and structured call records. Also generates assistant speech output.  
5. **Notification Services**  
   Delivers push notifications and reminder alerts to user devices.  
6. **Data Stores and Media Storage**  
   Stores call records, transcripts, settings, lists, and optional recordings securely.

---

## **13.3 Mobile app architecture**

### **13.3.1 Core responsibilities**

The mobile app must support:

* Account sign-in and multi-device usage  
* Device registration for push notifications  
* Biometric protection for sensitive content  
* Call history list, call detail view, and actions  
* Settings management (voice, temperament, hours, VIP, block, privacy)  
* Memory view and deletion controls  
* Reminder creation and reminder list

### **13.3.2 Key screens for Phase 1**

Minimum screen set:

* Onboarding and setup checklist  
* Home or dashboard  
* Call history  
* Call detail  
* Draft preview for text back  
* Reminders list  
* Settings pages:  
  * Voice and temperament  
  * Call modes and routing  
  * VIP list and block list  
  * Notifications and privacy  
  * Recording and retention  
  * Memory management  
  * Device management

### **13.3.3 Local storage rules**

The mobile app may cache limited data for speed, but must treat sensitive content as protected:

* Summaries and transcripts should be stored encrypted on device if cached.  
* Cache must be cleared on logout, device revoke, delete-all, and account deletion.  
* Biometric gating must apply before showing transcript and recordings, based on the selected policy.

---

## **13.4 Backend brain architecture**

### **13.4.1 Service structure**

Phase 1 can be implemented as a single backend application with clear internal modules, or as separate services. The recommended high level structure is to separate responsibilities logically, even if deployed together initially.

Core backend modules:

1. **Identity and Session Module**  
* User authentication  
* Session lifecycle  
* Device registration and revoke  
2. **Settings Module**  
* Stores and retrieves user settings  
* Validates schedules (business hours, quiet hours)  
* Versioned settings schema for expansion  
3. **Lists Module**  
* VIP list  
* Block list  
* Spam labeling preferences  
* Number normalization and matching  
4. **Call Orchestrator Module**  
* Receives call events from telephony provider  
* Starts the AI call flow  
* Tracks call state, timers, and handoff eligibility  
5. **Conversation Engine**  
* The logic that drives screening questions  
* Applies user temperament settings  
* Handles special flows (VIP, blocked, unknown, sales)  
* Enforces call length limits  
6. **Output Generator**  
* Produces structured summary  
* Produces transcript artifacts  
* Produces labels and reasons  
* Creates the call record  
7. **Actions Module**  
* Stores action history  
* Handles text drafting and approval-first sending  
* Manages reminders and reminder triggers  
8. **Notification Module**  
* Sends push notifications  
* Respects privacy mode and quiet hours  
* Sends reminder notifications  
9. **Media Module**  
* Stores and retrieves recordings if enabled  
* Secures access with authentication  
* Applies retention deletion  
10. **Audit and Monitoring Module**  
* Records security-relevant events  
* Provides operational logs and metrics

### **13.4.2 State management**

Call handling is stateful. The backend must track call state transitions such as:

* Call started  
* Screening in progress  
* Handoff offered  
* Handoff accepted or expired  
* Call ended  
* Transcript ready  
* Summary ready  
* Call record complete

The system must store state changes so failures can be investigated and so the user experience remains consistent.

### **13.4.3 Asynchronous processing**

Some tasks should run asynchronously to keep calls responsive:

* Transcription post-processing  
* Summary generation  
* Spam pattern analysis  
* Retention deletion jobs  
* Reminder triggers

Phase 1 should include a queue mechanism so tasks can retry safely and failures do not block the main flow.

---

## **13.5 Telephony integration design**

### **13.5.1 Inbound call entry points**

Phase 1 supports two inbound entry points:

* Calls to a dedicated AI number  
* Calls forwarded from the user’s personal number when busy or unreachable

Both entry points must route to the same call orchestrator logic and must produce the same call record outputs. The call record must store the source type.

### **13.5.2 Real-time audio handling**

During a call, the system must:

* Receive audio from the telephony provider  
* Convert user speech to text for screening and transcript  
* Convert assistant responses to speech for the caller  
* Keep latency low enough to feel natural

This generally requires a real-time streaming path for audio and a conversation engine that can respond quickly.

### **13.5.3 Handoff routing**

Live handoff requires the telephony integration to support connecting the caller to the user mid-call. The backend must:

* Trigger the handoff prompt  
* Receive the user acceptance  
* Execute the connect action  
* Record the handoff outcome

If the handoff fails, the conversation must continue without leaving the caller in silence.

---

## **13.6 AI pipeline design**

### **13.6.1 AI components in Phase 1**

Phase 1 uses a practical AI pipeline:

* Speech to text for transcript and screening decisions  
* Text generation for assistant responses  
* Summarization and structured extraction for the call summary  
* Optional text classification for labels (spam, sales, urgency)

### **13.6.2 Output requirements**

The AI pipeline must produce consistent artifacts:

* Transcript with speaker separation  
* Summary with strict formatting rules  
* Extracted fields:  
  * caller name  
  * reason  
  * callback number  
  * urgency  
  * optional best callback time  
* Label reasons for transparency

If any AI component fails, the system must still create a call record and mark missing parts clearly.

### **13.6.3 Safety and correctness boundaries**

The AI must:

* Present itself as an assistant, not the user  
* Avoid sharing sensitive information  
* Avoid making strong claims without evidence  
* Focus on capturing message details, not solving complex issues

---

## **13.7 Data storage design**

### **13.7.1 Primary data store**

The backend needs a primary database for:

* Users  
* Devices  
* Settings (versioned)  
* VIP and block lists  
* Call records and metadata  
* Labels and reasons  
* Notes  
* Actions  
* Reminders  
* Audit logs

All records must be scoped by user identity and designed to prevent cross-user access.

### **13.7.2 Transcript storage**

Transcripts can be stored:

* As structured text segments with speaker tags  
* Linked to a call record  
* Encrypted at rest  
* Protected by retention and deletion rules

### **13.7.3 Recording storage**

If recordings are enabled:

* Store recordings in a secure media store  
* Do not expose raw public links  
* Require authenticated access  
* Apply retention and deletion consistently

### **13.7.4 Data retention jobs**

Phase 1 must include background jobs that:

* Delete expired call records and related media  
* Verify deletion completion  
* Produce monitoring signals if deletion fails

---

## **13.8 Notification delivery design**

### **13.8.1 Push notifications**

Push notifications require:

* Device token registration per device  
* Per-user delivery logic that can send to multiple devices  
* Privacy mode rules for content  
* Quiet hours rules for alert intensity

### **13.8.2 Reminder notifications**

Reminders must:

* Trigger at scheduled times  
* Respect quiet hours behavior  
* Link back to the call record

### **13.8.3 Event templates**

Phase 1 should treat notifications as templates driven by event types:

* New call screened  
* Important call screened  
* Handoff available  
* Reminder due  
* Call processing degraded

This template system must be reusable for Phase B and C.

---

## **13.9 Environments and deployment model**

### **13.9.1 Required environments**

Phase 1 must have:

* Development environment  
* Staging environment  
* Production environment

Staging must mirror production as closely as possible so call routing and notification behavior can be tested before release.

### **13.9.2 Secrets management**

All vendor keys and sensitive secrets must be stored securely and not hard-coded in code or mobile app builds.

### **13.9.3 Release process basics**

Phase 1 must support:

* Backend deployment with rollback ability  
* Mobile app release pipeline for app stores  
* Configuration controls for feature toggles and safe rollout

---

## **13.10 Observability and operations**

### **13.10.1 Logs**

The system must produce logs that help diagnose:

* Call routing issues  
* AI pipeline failures  
* Notification delivery failures  
* Retention deletion failures

Logs must not contain full transcript content in plaintext.

### **13.10.2 Metrics**

Phase 1 must track:

* Call answer rate  
* Call completion rate  
* Transcript success rate  
* Summary success rate  
* Notification delivery success  
* Handoff offer rate and success rate  
* Retention deletion job success  
* Spam and flood throttling activity

### **13.10.3 Alerting**

Phase 1 must alert operators when:

* Call failures exceed a threshold  
* Summary or transcript generation fails repeatedly  
* Retention deletions fail  
* Abuse patterns or floods are detected  
* Costs spike unexpectedly

---

## **13.11 Scalability and future expansion readiness**

Phase 1 must be built so Phase B and C do not require rebuilding core systems. The technical blueprint must ensure:

* The settings model is versioned and can add new preferences for email and messaging.  
* The call record structure can evolve into a generic conversation record that supports threads.  
* The approval-first action pipeline can be reused for sending emails and messages.  
* The notification system can support new event types and new channels.  
* The connector pattern used for telephony can be reused for email and social platforms.  
* The identity, device, and security systems remain the same across phases.

---

## **13.12 Completion checklist for this chapter**

This chapter is complete when:

* The system architecture is defined with clear responsibilities per module.  
* Call flow is mapped from telephony to AI to stored call record to notification.  
* Asynchronous processing is planned for summaries, transcripts, retention, and reminders.  
* Data stores are defined and linked to retention and deletion rules.  
* Push notification delivery and privacy mode rules are defined.  
* Deployment environments, secrets handling, and monitoring requirements are defined.  
* The blueprint explicitly supports expansion into Phase B and C without rebuilding identity, settings, notifications, actions, and data lifecycle systems.

# **Chapter 14: Phase 1 delivery checklist and Phase B/C hooks**

## **14.1 Purpose of this chapter**

This chapter defines exactly what “Phase 1 is done” means and what must be built in Phase 1 so Phase 2 and Phase 3 can be implemented without rebuilding the system from scratch.

It contains two parts:

1. A Phase 1 delivery checklist with acceptance criteria  
2. The Phase B and C hooks, meaning the reusable foundations that must exist now

---

## **14.2 Phase 1 delivery checklist (what must ship)**

### **14.2.1 App store readiness**

Phase 1 must be deployable to app stores with:

* Working iOS and Android builds  
* Stable sign in and onboarding  
* Crash reporting enabled  
* Basic performance acceptable for daily use

Acceptance criteria:

* New user can sign up and reach the home screen without support help.  
* App passes store submission requirements.  
* App runs without critical crash loops in normal flows.

### **14.2.2 Multi-user accounts and multi-device support**

Phase 1 must support multiple user accounts and one account on multiple devices.

Acceptance criteria:

* Same account on phone and tablet shows the same call history and settings.  
* Removing a device instantly removes access.  
* Sign out all devices works.

### **14.2.3 Biometric unlock and privacy mode**

Phase 1 must protect call content and notifications.

Acceptance criteria:

* Transcripts and recordings are gated by biometrics when enabled.  
* Notification privacy mode works:  
  * Private mode hides caller details on lock screen.  
  * Preview mode shows caller details only if user enables it.  
* Sensitive cached data is cleared on logout and device revoke.

### **14.2.4 Call modes: dedicated number and conditional forwarding**

Phase 1 must support both call entry points with user settings to control them.

Acceptance criteria:

* Dedicated AI number can be assigned, displayed, shared, and tested.  
* Conditional forwarding can be configured with guided steps.  
* AI answers only when user is busy or unreachable, within carrier constraints.  
* The call record shows source type: dedicated or forwarded.

### **14.2.5 AI screening conversation**

Phase 1 must deliver consistent screening that feels natural but stays efficient.

Acceptance criteria:

* For every call, AI attempts to capture:  
  * caller name  
  * reason  
  * callback number  
  * urgency  
* Call length limits work and end politely.  
* Special handling works:  
  * VIP caller flow  
  * unknown caller flow  
  * blocked caller flow  
  * sales detection flow

### **14.2.6 Call record creation**

Every handled call must produce a usable call record.

Acceptance criteria:

* Call history list shows each call with:  
  * caller display  
  * one-line reason snippet  
  * urgency badge  
  * spam and VIP badges  
  * source label  
* Call detail shows:  
  * summary  
  * transcript  
  * labels and reasons  
  * actions  
* If summary fails, call record still exists with transcript if available.

### **14.2.7 Transcripts, summaries, and optional recordings**

Phase 1 must produce summaries and transcripts reliably.

Acceptance criteria:

* Transcript exists for the majority of handled calls.  
* Summary format is consistent and short.  
* If recording is enabled:  
  * recordings are accessible only with authentication and biometrics  
  * recordings follow retention and deletion rules  
* Recording is off by default.

### **14.2.8 Notifications and reminders**

Phase 1 must notify users and support follow-up reminders.

Acceptance criteria:

* New call screened notifications are delivered.  
* Important call logic works:  
  * VIP or urgent triggers Important status  
* Quiet hours exist and reduce noise.  
* Reminders can be created from a call record and trigger notifications.

### **14.2.9 Actions and follow-ups**

Phase 1 must allow real follow-up work from call records.

Acceptance criteria:

* One-tap callback works.  
* Text back exists with approval-first flow.  
* Notes can be added and synced.  
* Block and spam marking works and is reversible.  
* Action history appears on the call record.

### **14.2.10 VIP list and block list**

Phase 1 must include list management and priority controls.

Acceptance criteria:

* Users can add and remove VIP numbers.  
* VIP calls are marked Important and optionally allow longer call duration.  
* Users can block numbers.  
* Blocked behavior is consistent and does not create noise by default.  
* List changes sync across devices.

### **14.2.11 Live handoff**

Live handoff is optional but high value. If included in Phase 1, it must be reliable.

Acceptance criteria:

* User can enable handoff rules: VIP, urgent, or both.  
* Handoff prompt appears with correct privacy behavior.  
* User can accept on one device and connect successfully.  
* If user ignores or times out, AI completes screening and produces call record.  
* Handoff events are stored in call record.

If live handoff is not included, Phase 1 must still:

* Store the handoff settings model so it can be enabled later without redesign.

### **14.2.12 Memory, retention, and deletion**

Phase 1 must provide user control over stored data.

Acceptance criteria:

* User can set retention window: 7, 30, 90 days.  
* User can delete a call record and it deletes fully.  
* User can delete all call data.  
* User can view and delete memory items if memory is enabled.  
* Account deletion removes user data and revokes devices.

### **14.2.13 Security, abuse prevention, and monitoring**

Phase 1 must include security controls and operational readiness.

Acceptance criteria:

* Strict per-user authorization enforced in backend.  
* Encryption in transit and at rest.  
* Rate limiting for abuse and flood patterns.  
* Audit logs for key security events.  
* Monitoring of:  
  * call success  
  * summary and transcript success  
  * notification success  
  * retention deletion success

---

## **14.3 Phase B and Phase C hooks (what must exist now so no rebuild is needed)**

This section is the “no rebuild” contract. If these foundations exist in Phase 1, Phase B and C can reuse them. If they do not, later phases will require major redesign.

### **14.3.1 Unified identity and permissions core**

Phase 1 must implement identity in a way that supports new channels later.

What must exist:

* Multi-user identity with stable user\_id  
* Multi-device sessions and revoke  
* Per-user data isolation enforced at backend  
* A permissions model that can expand beyond calls

Why it prevents rebuild:

* Email and social integrations need tokens scoped to user\_id.  
* Any mistake in user isolation becomes catastrophic when more data types are added.

### **14.3.2 Unified settings and personalization framework**

Phase 1 must implement settings as a versioned, structured model.

What must exist:

* Settings schema with versioning  
* Temperament and tone presets stored as reusable preferences  
* Approval rules stored as reusable policy fields  
* Scheduling system for business hours and quiet hours

Why it prevents rebuild:

* Phase B needs tone and approval rules for email drafts.  
* Phase C needs summary style templates and memory preferences.

### **14.3.3 Unified conversation record model**

Phase 1 call records must be designed so they can evolve into a “conversation record” that supports email and messaging threads.

What must exist:

* A normalized record structure that can represent:  
  * calls now  
  * threads later  
* A consistent way to store:  
  * messages  
  * summaries  
  * labels  
  * participants  
  * actions  
  * timestamps

Why it prevents rebuild:

* If calls are stored in a call-only shape, Phase B requires a parallel system for threads.  
* A shared conversation model enables unified inbox later.

### **14.3.4 Unified action and approval pipeline**

Phase 1 texting back must be implemented as an approval-first action pipeline, not a one-off feature.

What must exist:

* Action object model with status:  
  * drafted  
  * approved  
  * sent  
  * failed  
* Template system for drafts  
* User approval UI flow  
* Audit events for outbound actions

Why it prevents rebuild:

* Phase B email sending is the same pipeline, just a different connector.

### **14.3.5 Connector framework for integrations**

Phase 1 telephony integration must be built using an internal connector pattern.

What must exist:

* A connector interface that supports:  
  * authentication configuration  
  * event handling  
  * retries and failure handling  
  * standardized logs and metrics  
* Telephony as the first connector

Why it prevents rebuild:

* Phase B will add email connectors and messaging connectors.  
* A connector pattern avoids rewriting business logic each time.

### **14.3.6 Unified notification and event system**

Phase 1 notifications must be event-driven.

What must exist:

* Event types such as:  
  * call\_record\_created  
  * important\_call  
  * handoff\_available  
  * reminder\_due  
* Notification templates with privacy mode support  
* Multi-device delivery logic

Why it prevents rebuild:

* Phase B and C add new event types, not a new notification system.

### **14.3.7 Data lifecycle framework**

Phase 1 retention and deletion must be built as reusable data lifecycle rules.

What must exist:

* Retention policy engine  
* Background deletion jobs with monitoring  
* User-driven delete functions  
* Cache clearing rules for device storage  
* Memory store with user-visible deletion

Why it prevents rebuild:

* Phase B and C store more content, and must follow the same rules.  
* Lifecycle consistency prevents privacy issues.

### **14.3.8 Security baseline that scales**

Phase 1 security must be designed to scale to more integrations and more sensitive data.

What must exist:

* Encryption in transit and at rest  
* Audit logs for key security and privacy actions  
* Rate limiting and abuse protection  
* Secrets management  
* Monitoring and alerting  
* Consent and permissions model ready for email and social tokens

Why it prevents rebuild:

* Later phases add higher-risk permissions. The baseline must already exist.

---

## **14.4 Phase 1 outputs that must be ready for Phase B and C planning**

After Phase 1 is documented and approved, the following outputs should exist to speed later phases:

* A stable settings schema and list of existing policies  
* A stable conversation record shape that can be extended  
* A connector interface definition  
* A notification event catalog  
* A data retention and deletion policy catalog  
* A security control checklist

These outputs are the bridge from Phase 1 build to Phase 2 and Phase 3 planning.

---

## **14.5 Completion checklist for this chapter**

This chapter is complete when:

* Phase 1 acceptance criteria are unambiguous for each feature.  
* Every “must ship” item has a clear pass or fail definition.  
* Phase B and C hooks are listed as non-negotiable foundations.  
* The document makes it obvious that Phase 1 is not throwaway work and is designed to expand without rebuilding core systems.

# **Chapter 15: Testing and verification**

## **15.1 Purpose of this chapter**

This chapter explains how Phase 1 is tested and proven to work before launch. It defines what “tested” means for a phone-first AI call concierge that handles personal data, runs on multiple devices, and depends on external systems like telephony and AI services.

Testing in Phase 1 has two jobs:

1. Prove the product works for real users in real conditions  
2. Prove the product is safe, private, and reliable enough to ship

Phase 1 cannot rely on “it works on my phone” testing. Call forwarding, carriers, audio quality, and lock screen privacy are real-world variables. This chapter defines how to test those variables in a repeatable way.

---

## **15.2 What “verification” means for Phase 1**

Verification means passing clear pass or fail checks. It is not a feeling. It is evidence.

### **15.2.1 What counts as evidence**

For Phase 1, acceptable evidence includes:

* A recorded test run result (not a call recording, but a QA record), with:  
  * test case name  
  * date and time  
  * device and OS version  
  * settings used  
  * steps taken  
  * results observed  
* Screenshots or screen recordings of the app UI for:  
  * call history and call detail  
  * notification behavior  
  * settings changes  
  * deletion confirmation  
* Backend evidence, such as:  
  * call record exists with correct fields  
  * correct source label (dedicated vs forwarded)  
  * transcript exists and is tied to the right call\_id and user\_id  
  * summary exists or clearly shows “missing” if failed  
* Observability evidence:  
  * key metrics updated  
  * no high error spikes  
  * retention deletion jobs completed

### **15.2.2 What “passed” means**

A test is passed only if:

* The expected outcome happened  
* The outcome is visible in the app and matches the backend record  
* Privacy settings behaved correctly  
* There were no hidden failures like missing transcripts without explanation

---

## **15.3 Test scope for Phase 1**

Phase 1 testing must cover all product areas that create value or risk.

### **15.3.1 Mobile app testing**

* Login and sessions  
* Multi-device sync  
* Biometric unlock behavior  
* Call history list and call detail screen  
* Text-back approval flow  
* Reminders creation and reminder notifications  
* Settings UI correctness and persistence

### **15.3.2 Backend brain testing**

* User isolation and authorization enforcement  
* Settings storage and validation  
* Call record creation correctness  
* Action storage and status updates  
* Notification event generation  
* Retention jobs and deletion pipelines  
* Audit logs

### **15.3.3 Telephony and routing testing**

* Dedicated AI number path  
* Call forwarding path (busy and unreachable)  
* Caller hangups and short calls  
* Rate limiting and spam flood behaviors  
* Live handoff routing, if included

### **15.3.4 AI conversation and outputs testing**

* Screening conversation correctness  
* Required fields captured  
* Transcript correctness and speaker separation  
* Summary format and usefulness  
* Label correctness (VIP, urgency, spam)  
* Failure behavior when AI services degrade

### **15.3.5 Notifications and privacy testing**

* Push notifications on multiple devices  
* Private mode vs preview mode  
* Quiet hours behavior  
* Lock screen leakage prevention  
* Handoff notifications privacy behavior, if included

### **15.3.6 Security and privacy testing**

* Authentication and session security behavior  
* Authorization and cross-user access prevention  
* Device revoke behavior  
* Data deletion correctness  
* Recording access protections, if enabled  
* Logging policy validation, no sensitive content in logs

---

## **15.4 Test environments and how they are used**

Phase 1 must have three environments with clear purpose and rules.

### **15.4.1 Development environment**

Used for fast iteration:

* Engineers run quick local tests  
* Unit tests and basic integration tests run on every change  
* Not suitable for final telephony verification

### **15.4.2 Staging environment**

Used for realistic end-to-end testing:

* Telephony integration connected  
* Push notifications connected  
* Realistic settings and call flows  
* No real user data  
* Test accounts and test phone numbers only

Staging should match production behavior as closely as possible. If staging differs, end-to-end results become unreliable.

### **15.4.3 Production environment**

Used only for:

* Controlled smoke tests during release  
* Real users after go live

Production testing must be limited and safe. It should never be used for unstructured experiments that could leak data or cause cost spikes.

---

## **15.5 Test data rules and privacy rules for testing**

### **15.5.1 Test accounts**

Phase 1 should maintain a set of test accounts with known configurations, such as:

* Standard user with default settings  
* User with strict privacy mode and biometrics enabled  
* User with VIP list and block list populated  
* User with live handoff enabled, if included  
* User with recordings enabled, if included

### **15.5.2 Test numbers**

Phase 1 must use test numbers for calls. Each test number should be mapped to a known “caller type” scenario:

* Normal caller  
* VIP caller  
* Unknown caller  
* Blocked caller  
* Sales caller  
* Spam-like repeated caller

### **15.5.3 No sensitive content in logs**

During testing, logs must not contain full transcripts or recordings in plaintext. Testing must verify this is true by sampling logs and confirming the policy is enforced.

---

## **15.6 Test types used in Phase 1**

### **15.6.1 Automated tests**

Automated tests are for correctness at speed. They reduce regression risk.

Minimum automated coverage areas:

* Settings validation:  
  * business hours schedules  
  * quiet hours schedules  
  * toggles and preset IDs  
* Phone number normalization and matching:  
  * VIP match  
  * block match  
  * international formatting consistency  
* Authorization checks:  
  * user cannot read another user’s call record  
  * user cannot access another user’s recording  
* Data lifecycle:  
  * deletion of call record removes linked items  
  * retention expiration triggers deletion  
* Action pipeline:  
  * text draft created  
  * approval required by default  
  * sent status updates and failure status updates

Automated tests should be required for merges into main branch.

### **15.6.2 Manual QA scripts**

Manual scripts are essential because the system includes real devices, audio, and notifications.

Manual scripts must be written as step-by-step instructions that a tester can follow without improvising. Each script must include:

* Preconditions (settings, device state)  
* Steps  
* Expected UI results  
* Expected backend results  
* Evidence required

### **15.6.3 End-to-end call simulations**

End-to-end tests simulate real call flows through telephony, AI, backend storage, and mobile presentation.

End-to-end tests must exist for:

* Dedicated AI number calls  
* Forwarded calls triggered by busy  
* Forwarded calls triggered by unreachable  
* Edge cases like hangups and low audio quality  
* Optional live handoff, if included

---

## **15.7 Feature-by-feature verification mapping**

This section maps the Phase 1 acceptance criteria into tests. Each feature must have at least one “happy path” test and at least one failure or edge case test.

### **15.7.1 Accounts, sessions, and devices**

Tests must verify:

* New user can sign up and sign in  
* Same account can sign in on phone and tablet and see the same call history  
* Settings change on one device appears on the other  
* Device revoke removes access immediately  
* Sign out all devices works

Evidence:

* Screenshots from both devices showing consistent state  
* Backend session logs showing revoke effect  
* Confirm revoked device cannot fetch call detail

### **15.7.2 Biometric lock**

Tests must verify:

* Biometrics required before viewing transcript and recording  
* Biometrics behavior after app background and return  
* Incorrect biometric attempt does not leak content

Evidence:

* Screen recording showing lock screen in app  
* Confirmation that transcript is hidden until unlock

### **15.7.3 Call modes and routing**

Dedicated number tests must verify:

* Incoming call is answered by AI  
* Call record created  
* Source label shows dedicated  
* Notifications sent

Forwarding tests must verify:

* When user is reachable, AI does not answer  
* When user is busy, AI answers via forwarding  
* When user is unreachable, AI answers via forwarding  
* Source label shows forwarded

Evidence:

* Call record shows correct source  
* Setup test tool results screen  
* Note any carrier limitations in results

### **15.7.4 AI call screening**

Tests must verify:

* AI introduces itself as an assistant  
* AI asks for required fields  
* AI ends the call politely within time limits  
* Special flows behave correctly:  
  * VIP flow  
  * unknown flow  
  * sales flow  
  * blocked flow

Evidence:

* Transcript shows expected question structure  
* Summary includes captured fields  
* Labels applied as expected

### **15.7.5 Summary and transcript quality**

Tests must verify:

* Summary is 3 to 6 bullets and includes reason and callback details  
* Transcript has speaker separation and is readable  
* Uncertainty is handled by stating uncertainty, not guessing  
* If summary fails, call record still exists and shows missing summary state

Evidence:

* Call detail screenshots for several calls  
* Backend call record fields showing summary and transcript status

### **15.7.6 Notifications and quiet hours**

Tests must verify:

* Notification arrives for new call screened  
* Private mode hides caller details  
* Preview mode shows caller details  
* Quiet hours makes normal calls silent while Important calls behave as configured  
* Multi-device notifications arrive

Evidence:

* Lock screen screenshots for private and preview mode  
* In-app notification deep link opens correct call record

### **15.7.7 Actions and follow-ups**

Tests must verify:

* Call back button works and action is logged  
* Text back is approval-first by default  
* Draft is editable and template selection works, if included  
* Notes save and sync across devices  
* Reminders trigger a notification at the right time  
* Block and spam marking works and is reversible

Evidence:

* Call record activity section shows actions  
* Reminders list shows created reminders  
* Notification shows reminder behavior

### **15.7.8 VIP and block list behavior**

Tests must verify:

* VIP calls get VIP badge and Important status  
* Blocked numbers follow blocked handling rules  
* Block suggestions appear only when criteria are met, if included  
* User can add and remove VIP and block entries

Evidence:

* VIP list screen and block list screen screenshots  
* Call records show VIP and block effects

### **15.7.9 Live handoff tests, if included**

Tests must verify:

* Handoff triggers only for eligible calls  
* Prompt arrives fast enough to be useful  
* Privacy mode hides details on lock screen when private  
* User accepts and is connected  
* Timeout and ignore paths work and AI continues screening

Evidence:

* Handoff event fields stored in call record  
* Screen recording of accept flow  
* Confirmation that only one device can accept

---

## **15.8 Carrier and device matrix testing**

Call forwarding behavior depends on carriers and device states. Phase 1 should define a minimum test matrix.

### **15.8.1 Device matrix**

At minimum, test:

* iOS recent version on a modern iPhone  
* Android recent version on a common Android device  
* Tablet device for multi-device behavior

The goal is not to test every device, but to prove core behaviors across platforms.

### **15.8.2 Carrier category matrix**

Forwarding behavior differs by carrier. Phase 1 should test at least:

* One carrier where conditional forwarding works as intended  
* One carrier where forwarding behavior is limited or behaves differently

The result must be documented as “known behavior” and reflected in the in-app setup guidance so users are not surprised.

### **15.8.3 Network condition testing**

At minimum, test:

* Good network  
* Weak network  
* Temporary network loss during app usage  
* High latency during call

The system should still create call records and avoid crashing. If AI output is delayed, the call record should show a processing state and complete later.

---

## **15.9 Security and privacy verification suite**

Phase 1 must include a dedicated security verification suite. This is a required part of testing, not optional.

### **15.9.1 Authentication and session safety**

Verify:

* Rate limiting on login attempts  
* Session expiry and refresh behavior  
* Sign out all devices actually invalidates sessions

### **15.9.2 Authorization and isolation**

Verify:

* User A cannot access User B call record even if call\_id is guessed  
* User A cannot access User B recording link  
* VIP and block list APIs are scoped by user\_id

This must be verified with backend tests, not only UI.

### **15.9.3 Device revoke and cache clearing**

Verify:

* Revoked device cannot access call content  
* Cached sensitive content is cleared or inaccessible  
* App does not show old transcripts after logout

### **15.9.4 Notification privacy leakage**

Verify:

* Private mode shows no caller reason or transcript content on lock screen  
* Preview mode shows exactly what is allowed and nothing more  
* Handoff notifications follow the same privacy rules

### **15.9.5 Recording access safety**

If recording is enabled:

* Recording playback requires authentication and biometrics as configured  
* No public unprotected recording URL exists  
* Recording deletion occurs on call record deletion and retention expiry

### **15.9.6 Logging safety**

Verify:

* Logs do not include transcript text in plaintext  
* Audit logs do not include sensitive call content  
* Debug logs are not accidentally enabled in production builds

---

## **15.10 Retention, deletion, and “real deletion” verification**

Deletion must be tested like a feature, because it is a trust requirement.

### **15.10.1 Single call deletion**

Verify that deleting one call record removes:

* summary  
* transcript  
* recording file, if any  
* notes  
* action history  
* linked reminders

Also verify:

* The deleted call no longer appears on any device after sync  
* The backend no longer serves the deleted content

### **15.10.2 Delete all call data**

Verify:

* All call records disappear in app  
* Backend no longer serves any call data  
* Device cache is cleared

### **15.10.3 Retention expiration**

Verify:

* Calls older than retention window are deleted automatically  
* Deletion job runs reliably  
* Failures generate alerts

### **15.10.4 Account deletion**

Verify:

* Account deletion removes all user data  
* Devices are revoked  
* Phone number mappings are removed  
* User cannot log in again

---

## **15.11 Reliability, load, and cost protection tests**

Phase 1 has direct cost drivers. Testing must include abuse and cost protection.

### **15.11.1 Call flood tests**

Simulate repeated calls to a dedicated number and verify:

* Rate limits engage  
* The system remains stable  
* Costs do not spike uncontrollably  
* User does not receive noisy notifications from blocked patterns, unless configured

### **15.11.2 Queue and retry tests**

Verify:

* Summary generation retries on transient failure  
* Transcript generation failures create a call record with clear status  
* No endless retry loops occur  
* Failed jobs are visible in monitoring

### **15.11.3 Service degradation behavior**

Simulate vendor slowdowns and verify:

* Calls still end cleanly  
* Call record still created  
* Missing outputs show clear “unavailable” state  
* User can retry summary generation later, if supported

---

## **15.12 Test reporting and sign-off**

### **15.12.1 Test report structure**

Phase 1 should produce a single Phase 1 test report that includes:

* Summary of what was tested  
* Pass or fail counts by category  
* Critical issues list  
* Deferred items list with reasons  
* Known limitations list, especially carrier forwarding limitations  
* Evidence links, such as screenshots and logs references

### **15.12.2 Sign-off rules**

Phase 1 should define who signs off:

* QA sign-off for test completion  
* Engineering sign-off for backend stability  
* Product sign-off for user experience and quality  
* Security sign-off for privacy and isolation checks

### **15.12.3 Go or no-go criteria from testing**

Phase 1 must define a minimum pass list that must be green before release. Examples of non-negotiable passes:

* No cross-user data access possible  
* Notification private mode works  
* Call record creation works reliably  
* Deletion works for single call and delete all  
* Dedicated number path works end to end  
* At least one validated forwarding scenario works end to end in staging

If these are not met, Phase 1 is not ready to go live.

---

## **15.13 Completion checklist for this chapter**

This chapter is complete when:

* Every Phase 1 feature has repeatable tests with pass or fail outcomes.  
* Staging supports realistic end-to-end call and notification testing.  
* Security verification suite exists and is executed.  
* Deletion and retention are verified as real and complete.  
* Load and abuse behaviors are tested enough to prevent obvious cost and stability failures.  
* A Phase 1 test report template exists and sign-off rules are defined.

# **Chapter 16: Readiness**

## **16.1 Purpose of this chapter**

This chapter defines what must be ready before Phase 1 is allowed to launch to real users. Testing proves the product can work. Readiness proves the product can run safely in the real world without constant emergencies.

Phase 1 readiness includes:

* Technical readiness: systems, integrations, and performance  
* Security and privacy readiness: data protection and safe defaults  
* Operational readiness: monitoring, support, and incident handling  
* App store readiness: release pipeline and compliance basics  
* Rollout readiness: feature flags and fast shutdown options

The outcome of this chapter is a clear go or no-go checklist.

---

## **16.2 What “ready” means in Phase 1**

Phase 1 is ready only when all of these are true:

1. Users can complete onboarding and begin using the core feature without support help.  
2. Calls are handled end to end and produce call records reliably.  
3. Privacy defaults are safe and proven in real devices (lock screen, biometrics, device revoke).  
4. The team can detect failures quickly using dashboards and alerts.  
5. The team can respond to incidents with defined steps, including rollback or feature shutdown.  
6. The system has basic cost protection so one bad day does not create uncontrolled spend.

Readiness is not only a code state. It is also a process state.

---

## **16.3 Release readiness checklist overview**

This section is the master checklist. Each item below must be marked as:

* Done and verified  
* Not done and blocking  
* Deferred and accepted risk

### **16.3.1 Master readiness checklist**

**Product and UX**

* Onboarding is complete and understandable.  
* Core settings are easy to find and change.  
* Call history and call detail screens are stable.  
* Text-back approval flow is clear and safe.  
* Forwarding setup guidance is understandable.

**Technical**

* Production backend deployed and stable.  
* Telephony routing stable for dedicated number and forwarding.  
* AI pipeline stable enough for real use.  
* Notifications deliver reliably on supported devices.  
* Retention and deletion jobs are scheduled and verified.

**Security and privacy**

* Private notification mode is default.  
* Biometric lock works and protects sensitive content.  
* Authorization prevents cross-user data access.  
* Device revoke works and clears cached content.  
* Recording is off by default and protected if enabled.

**Operations**

* Dashboards exist and are correct.  
* Alerts exist and are assigned to owners.  
* Support workflow exists with clear troubleshooting steps.  
* Incident response and rollback steps exist.

**App store**

* iOS and Android builds signed and versioned.  
* Store listing basics prepared.  
* Privacy disclosures and required texts prepared.

**Rollout controls**

* Feature flags exist for risky features.  
* Rate limits are adjustable without redeploy.  
* Ability to stop high-cost paths quickly exists.

---

## **16.4 Technical readiness**

### **16.4.1 Production environment readiness**

Phase 1 must have a production environment that is separate from staging.

Production must include:

* Backend services deployed with a clear version  
* Databases provisioned and secured  
* Object or media storage provisioned if recordings are enabled  
* Background job runners for summary, retention, and reminders  
* Network and access rules that limit who can access production systems

Verification evidence:

* Production health endpoint shows healthy  
* A controlled test call creates a call record in production  
* A controlled push notification is delivered to a test device

### **16.4.2 Secrets and configuration readiness**

Phase 1 must not ship with secrets in code or in the app.

Requirements:

* All API keys stored in secure secrets storage  
* Rotation plan documented for at least:  
  * telephony keys  
  * AI provider keys  
  * push notification keys  
* Configuration is not hard-coded and can be changed safely:  
  * rate limits  
  * feature toggles  
  * retention defaults

Verification evidence:

* Code scan or review confirms no secrets in repo  
* Production secrets are loaded from the secret store  
* No debug keys exist in production

### **16.4.3 Database readiness**

The database must be ready for real usage.

Requirements:

* Migrations applied cleanly  
* Indexes exist for common queries:  
  * call history list  
  * call detail retrieval  
  * reminders  
  * audit logs  
* Backup strategy exists and is tested  
* Restore procedure exists and is tested at least once in staging

Verification evidence:

* Backup job runs and produces backups  
* Restore test restores a staging copy successfully

### **16.4.4 Telephony readiness**

Telephony is a core dependency. Phase 1 must verify telephony setup and failure behavior.

Requirements:

* Dedicated AI number provisioned and connected correctly  
* Forwarding setup steps are documented inside the app  
* Forwarding tests can confirm that forwarding is active  
* Clear fallback behavior if AI fails mid-call  
* Abuse controls exist:  
  * rate limiting per caller  
  * rate limiting per user line

Verification evidence:

* Dedicated number test call:  
  * answered by AI  
  * call record created  
  * notification sent  
* Forwarding test call:  
  * AI answers only when busy or unreachable  
  * call record created  
  * source label shows forwarded  
* Flood simulation shows rate limit engaging

### **16.4.5 AI pipeline readiness**

The AI pipeline must be stable enough that users do not feel it is random.

Requirements:

* Conversation latency acceptable for natural call flow  
* Transcript success rate target defined and monitored  
* Summary success rate target defined and monitored  
* Clear behavior when AI output is missing:  
  * call record still created  
  * missing parts clearly marked

Verification evidence:

* A sample set of test calls produces transcripts and summaries consistently  
* Summary format rules are followed in the sample set  
* Failure simulation shows correct fallback behavior

### **16.4.6 Notifications readiness**

Notifications must work across supported devices.

Requirements:

* Push tokens register correctly per device  
* Multi-device delivery works  
* Notification privacy mode works:  
  * private by default  
  * preview optional  
* Quiet hours behavior works

Verification evidence:

* Two devices on the same account both receive notifications  
* Private mode notifications do not leak call reason on lock screen  
* Preview mode shows only permitted content

---

## **16.5 Security and privacy readiness**

### **16.5.1 Privacy defaults confirmed**

Phase 1 must ship with safe defaults.

Defaults must be:

* Notification privacy mode: private  
* Recording: off  
* Approval-first texting: on  
* Biometrics: prompted and recommended during onboarding

Verification evidence:

* New user onboarding results in private mode notifications  
* Recording is not active unless the user explicitly enables it

### **16.5.2 Authentication and session readiness**

Requirements:

* Login attempts rate limited  
* Sessions expire and refresh safely  
* Sign out all devices works  
* Device revoke works

Verification evidence:

* Device revoke removes access immediately  
* Revoked device cannot fetch call detail even if it still has the app open

### **16.5.3 Authorization and isolation readiness**

Requirements:

* All call records scoped by user identity on the backend  
* VIP and block lists scoped by user identity  
* Media access protected and never publicly exposed

Verification evidence:

* Attempted cross-user access is blocked in backend tests  
* Recording links require authentication and cannot be accessed directly without it

### **16.5.4 Data protection readiness**

Requirements:

* Encryption in transit for all app to backend traffic  
* Encryption at rest for sensitive server data  
* Encrypted local storage for cached sensitive data if any  
* Cache clearing on logout, revoke, delete-all

Verification evidence:

* Local cache clearing verified on logout and revoke  
* Server data encryption configuration verified

### **16.5.5 Deletion and retention readiness**

Requirements:

* Retention policy is configured and enabled  
* Retention job runs on a schedule  
* Delete single call works and removes linked data  
* Delete all call data works  
* Account deletion works

Verification evidence:

* Retention deletion verified in staging with old test calls  
* Delete-all verified and confirmed across multiple devices

---

## **16.6 Operational readiness**

## **16.6.1 Monitoring readiness**

Phase 1 must have dashboards that show the system health in real time.

Minimum dashboards:

* Call volume and call completion rate  
* Transcript success rate  
* Summary success rate  
* Notification delivery success  
* Handoff offer and success rate if enabled  
* Retention deletion job success  
* Error rate by endpoint  
* Cost drivers:  
  * minutes handled  
  * AI usage metrics  
  * unusual spikes

Verification evidence:

* Dashboards show expected data during staging tests  
* Alerts trigger correctly during simulated failures

### **16.6.2 Alerting readiness**

Alerts must exist for:

* Call failure spike  
* Summary or transcript failure spike  
* Notification delivery failure spike  
* Retention deletion job failure  
* Abuse or flood detection  
* Cost spike detection

Each alert must have:

* An owner  
* A response playbook link or short steps  
* Severity level

Verification evidence:

* Each alert can be triggered in staging and is delivered to the owner

### **16.6.3 Support readiness**

Even with a great app, Phase 1 will have user questions. Support readiness prevents chaos.

Support must be prepared for:

* Forwarding setup issues  
* Notifications not arriving  
* Transcript missing or delayed  
* Summary missing or delayed  
* Login and device sync issues  
* Privacy and biometrics questions

Support must have:

* A troubleshooting guide with step-by-step checks  
* A way to trace a user problem using call\_id and timestamps  
* A small set of support reply templates

Verification evidence:

* A support person can resolve the top 5 expected issues using the guide

### **16.6.4 Incident response readiness**

Phase 1 must have a simple incident plan.

Minimum incident plan includes:

* What counts as a critical incident  
* Who is contacted first  
* How to pause rollout  
* How to disable risky features  
* How to roll back backend deployments  
* How to communicate status internally

Verification evidence:

* A tabletop exercise is run at least once in staging:  
  * simulate a call failure spike  
  * simulate notification outage  
  * simulate cost spike from spam flood

---

## **16.7 App store readiness**

### **16.7.1 Build and release pipeline readiness**

Requirements:

* iOS and Android builds signed correctly  
* Versioning scheme defined  
* Release pipeline supports:  
  * internal testing builds  
  * beta builds  
  * production release builds

Verification evidence:

* A release candidate build can be produced on demand  
* Crash reporting works in release builds

### **16.7.2 Store listing readiness**

Minimum store listing items:

* App name and description  
* Screenshots showing call history and privacy mode  
* Basic help text describing forwarding and dedicated number  
* Contact and support method  
* Required privacy texts and disclosures

Verification evidence:

* Listing drafts exist and match actual product behavior

---

## **16.8 Feature flags and rollout controls readiness**

Phase 1 must have the ability to reduce risk quickly without shipping a new app build.

Minimum feature flags:

* Recordings on or off  
* Live handoff on or off  
* Text sending connector on or off  
* Advanced spam detection on or off  
* Summary retry on or off

Operational controls:

* Adjust rate limits without redeploy  
* Disable high-cost paths quickly if spam flood occurs

Verification evidence:

* Flags can be toggled and changes take effect quickly  
* Rate limits can be updated safely

---

## **16.9 Go or no-go readiness review**

### **16.9.1 Minimum pass list**

Phase 1 must not go live unless these are true:

* Dedicated number call path works end to end  
* At least one verified forwarding scenario works end to end in staging  
* Call record creation is reliable  
* Notification private mode works and is default  
* Deletion works:  
  * delete single call  
  * delete all call data  
* Cross-user access is impossible based on verification tests  
* Monitoring and alerts are live and owned

### **16.9.2 Deferred items policy**

Some items can be deferred only if:

* The core call experience is stable  
* Privacy is not weakened  
* There is a clear mitigation, such as a feature flag off by default

Deferred items must be listed explicitly with:

* Risk level  
* Mitigation  
* When it will be addressed

### **16.9.3 Readiness sign-off roles**

Phase 1 readiness sign-off should include:

* Engineering sign-off: stability and deployability  
* QA sign-off: test coverage completed  
* Security sign-off: privacy and isolation checks passed  
* Product sign-off: user experience meets Phase 1 goals

---

## **16.10 Completion checklist for this chapter**

This chapter is complete when:

* The master readiness checklist exists and is filled with evidence.  
* Production environment is stable and secured.  
* Telephony routing, AI outputs, and notifications are verified in staging.  
* Privacy defaults are confirmed and enforced.  
* Retention and deletion are verified and monitored.  
* Dashboards and alerts exist and have owners.  
* Support and incident plans exist and have been rehearsed at least once.  
* Feature flags allow quick shutdown of risky or expensive features.  
* Go or no-go criteria are clear and decision owners are defined.

# **Chapter 17: Go live**

## **17.1 Purpose of this chapter**

This chapter defines how Phase 1 is launched safely. “Go live” is not a single button. It is a controlled sequence of steps that reduces risk, protects users, and ensures the team can detect issues quickly.

Phase 1 has real-time dependencies such as telephony and AI. If go live is sloppy, users will experience missed calls, broken transcripts, or privacy leaks. This chapter sets a step-by-step go live plan with monitoring, rollback, and early feedback loops.

---

## **17.2 Go live strategy for Phase 1**

Phase 1 should not launch to everyone at once. The safer approach is a controlled rollout.

### **17.2.1 Recommended rollout approach**

Phase 1 go live should use a staged approach:

1. Internal team dogfooding  
2. Closed beta for a small group of external users  
3. Gradual scale-up in controlled batches  
4. Full public availability when stability is proven

This avoids large-scale failures while still collecting real feedback quickly.

### **17.2.2 Goals of staged rollout**

* Confirm forwarding works in real carriers and real networks  
* Confirm notification delivery in real device conditions  
* Confirm transcripts and summaries succeed under real load  
* Identify the top user confusion points early, especially forwarding setup  
* Control cost while usage patterns stabilize

---

## **17.3 Pre-go live requirements**

Go live must not begin unless Chapter 15 testing and Chapter 16 readiness are completed.

### **17.3.1 Minimum must-pass items before any real user**

* Dedicated AI number path works end to end  
* At least one proven forwarding scenario works end to end in staging  
* Privacy defaults are correct:  
  * private notifications by default  
  * recording off by default  
* Deletion works:  
  * delete single call  
  * delete all call data  
* Cross-user access prevention is verified  
* Monitoring dashboards and alerts are live and owned  
* Feature flags exist for risky features and have been tested

---

## **17.4 Go live plan in phases**

## **17.4.1 Phase 0: Internal dogfooding**

This phase uses internal staff accounts only.

What happens:

* Internal users install the production build or a production-connected build  
* They use real call flows:  
  * dedicated number  
  * forwarding busy  
  * forwarding unreachable  
* They test notifications, actions, and deletion in daily use

Success criteria:

* No critical bugs that block core usage  
* No privacy leaks in lock screen notifications  
* Call records appear reliably with transcript and summary most of the time  
* Support can resolve forwarding setup issues using the guide

Stop criteria:

* Call failures spike  
* Summaries consistently missing  
* Notification delivery inconsistent  
* Any cross-user or privacy leakage risk found

---

## **17.4.2 Phase 1: Closed beta**

This phase uses a limited number of external users. These are early adopters who accept that the product is still improving.

How users are selected:

* Invite-only  
* Small group with varied devices and carriers

What happens:

* Users onboard using guided setup  
* Users run real inbound calls through the assistant  
* The team collects structured feedback

Success criteria:

* Onboarding completion rate is acceptable  
* Most calls produce usable summaries and transcripts  
* Notifications arrive and do not leak content  
* Users report real value: fewer interruptions and clearer call messages

Stop criteria:

* Repeated forwarding failures across multiple users  
* High crash rate  
* High volume of support tickets that indicate onboarding is unclear  
* Cost spikes caused by abuse patterns not being controlled

---

## **17.4.3 Phase 2: Gradual rollout**

This phase increases user count in batches.

Batch strategy:

* Add a small number of users per batch  
* Observe metrics for a defined window  
* Only proceed if metrics remain stable

Batch scaling rules:

* Increase slowly if call success and AI success rates remain stable  
* Pause if any alert thresholds are hit  
* Roll back or disable features if a single component becomes unstable

Success criteria:

* Stable metrics across increasing load  
* Support requests remain manageable  
* No major regressions after releases

Stop criteria:

* Summary or transcript failure rate rises above threshold  
* Notification failures rise above threshold  
* Abuse patterns create cost risk  
* Retention deletion jobs fail

---

## **17.4.4 Phase 3: Public availability**

This phase is full store availability.

Requirements before public:

* Forwarding setup content is clear and tested  
* Help center content exists for top issues  
* Monitoring is mature enough to handle higher volume  
* Incident response process is practiced  
* Cost protection and abuse control are effective

---

## **17.5 Go live step-by-step runbook**

This section is the exact operational sequence for launch day.

### **17.5.1 Day before go live**

* Confirm production environment health  
* Confirm telephony webhooks active and responding  
* Confirm push notification delivery in production  
* Confirm retention job schedule enabled  
* Confirm audit logging enabled  
* Confirm feature flags state:  
  * recording off by default  
  * live handoff either off or limited, depending on readiness  
  * text back sending enabled only with approval-first  
* Confirm support guide and incident steps are accessible

### **17.5.2 Go live day: release actions**

Step-by-step:

1. Deploy backend release to production  
2. Run backend smoke tests  
3. Enable required feature flags in the safe order:  
   * core call record creation  
   * notifications  
   * actions pipeline  
   * optional: handoff  
4. Release mobile app builds or publish store availability  
5. Onboard first controlled users  
6. Run production smoke call tests:  
   * dedicated number call  
   * forwarding busy call  
   * forwarding unreachable call if possible  
7. Confirm:  
   * call record created  
   * notification delivered  
   * transcript and summary produced  
   * deletion works

### **17.5.3 First hour verification**

During the first hour:

* Watch dashboards live  
* Confirm no sudden spikes in call failure or error rates  
* Confirm no unusual rate limiting patterns or floods  
* Confirm support channel is staffed and responsive

---

## **17.6 Monitoring during the first 24 to 72 hours**

This is the highest-risk period.

### **17.6.1 Metrics to watch continuously**

Minimum monitoring list:

* Call answer rate  
* Call completion rate  
* Transcript success rate  
* Summary success rate  
* Processing time for transcript and summary  
* Notification delivery success  
* Handoff offer and success rate if enabled  
* Error rate by endpoint  
* Rate limiting and flood detection events  
* Cost indicators:  
  * total minutes handled  
  * AI pipeline usage  
  * unusual spikes

### **17.6.2 Thresholds and actions**

For each metric, Phase 1 should define:

* Normal range  
* Warning threshold  
* Critical threshold  
* Exact action to take at warning and critical

Actions include:

* Pause onboarding new users  
* Disable a feature with flags, such as handoff or recordings  
* Reduce call length limits to reduce cost  
* Increase rate limiting temporarily to stop abuse  
* Roll back backend release

---

## **17.7 Incident response and rollback plan**

### **17.7.1 What counts as a critical incident**

Examples of critical incidents:

* Calls not being answered when they should be  
* Call records not being created  
* Private notification content leaking on lock screen  
* Cross-user data exposure  
* Retention deletion failing repeatedly  
* Cost spike due to spam flood

### **17.7.2 Immediate response steps**

1. Confirm scope: how many users affected  
2. Freeze rollout: stop adding users  
3. Apply quickest mitigation:  
   * disable handoff  
   * disable recordings  
   * restrict preview notifications  
   * tighten rate limits  
4. If needed, rollback backend deployment  
5. Document incident timeline and actions taken

### **17.7.3 Rollback options**

Rollback must be possible in multiple forms:

* Backend version rollback  
* Feature flag shutdown  
* Rate limit tightening  
* Temporarily force private notification mode if needed

Rollback must prioritize privacy and call stability.

---

## **17.8 Early user feedback loop**

### **17.8.1 What feedback matters most in Phase 1**

The most valuable Phase 1 feedback is:

* Forwarding setup confusion points  
* Whether call summaries are actually useful  
* Whether notifications are too frequent or too vague  
* Whether spam control reduces annoyance  
* Whether users trust the system with private content

### **17.8.2 Feedback collection methods**

Phase 1 should collect feedback using:

* In-app feedback form  
* Support channel tagging by category  
* A simple short survey after a user has handled a certain number of calls

### **17.8.3 Feedback triage rules**

Feedback must be categorized into:

* Bugs that break core flows  
* Bugs that break privacy or security  
* Usability improvements  
* AI quality issues  
* Carrier and forwarding differences

Core and privacy bugs must be fixed first.

---

## **17.9 Post-launch patch plan**

Phase 1 should expect fixes after go live.

### **17.9.1 First patch priorities**

Typical high value priorities after first real users:

* Improve forwarding guidance and setup checks  
* Reduce false spam labels  
* Improve summary consistency and shortness  
* Improve notification clarity without leaking content  
* Fix multi-device sync edge cases

### **17.9.2 Release cadence**

Phase 1 should adopt a controlled cadence:

* Fast backend fixes when safe  
* App updates with careful review due to store processes  
* Feature flags used to reduce risk while app updates roll out

---

## **17.10 Handoff into Phase B planning**

Phase B should not begin until Phase 1 is stable enough.

### **17.10.1 When to start Phase B planning**

Phase B planning can start when:

* Core call flows are stable  
* Privacy controls are proven  
* Monitoring shows stable trends  
* Support issues are manageable

### **17.10.2 What Phase 1 metrics inform Phase B**

Phase B should be guided by:

* What tone presets users choose most  
* How often users approve and send text replies  
* How often users set reminders  
* Which call categories are most common  
* How many users enable preview notifications  
* Common user workflows from call actions

This ensures Phase B builds what users actually want.

### **17.10.3 Confirm “no rebuild” foundations**

Before adding Phase B connectors, confirm:

* Settings schema stable  
* Conversation record model stable  
* Action pipeline stable  
* Notification system stable  
* Retention and deletion stable  
* Authorization and audit logs stable

---

## **17.11 Completion checklist for this chapter**

This chapter is complete when:

* A staged rollout plan exists with clear success and stop criteria.  
* A go live day runbook exists with a fixed step-by-step order.  
* Smoke test suite for production exists.  
* Monitoring metrics and thresholds are defined with actions.  
* Incident response and rollback steps are written and tested once.  
* Feedback collection and triage rules are defined.  
* Patch plan priorities are clear.  
* The handoff into Phase B planning criteria is defined so Phase 1 stabilizes first.

