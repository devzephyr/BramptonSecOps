**The revised “action gating” approach is much better than revoking the driver’s session.** Keep the map, telemetry, and read-only cockpit alive. Require WebAuthn only when the driver performs a compliance-sensitive write, such as confirming a break, resuming driving after a required break, correcting duty status, or completing custody.

However, the backend—not the frontend—must decide whether authentication is required. The frontend should only display the state returned by the server.

## Recommended architecture

```text
Vehicle/GPS telemetry
        ↓
POST /api/loads/:id/position
        ↓
Server derives:
- current speed
- stopped duration
- stale telemetry
- current duty status
- driving time
- break owed
- rest/sleeper recommendation
        ↓
Returns authoritative driver state
        ↓
Frontend renders HUD
        ↓
Driver taps an action
        ↓
Frontend requests a WebAuthn challenge
        ↓
Driver authenticates locally
        ↓
Backend verifies challenge and performs the write
```

Do **not** revoke the session or expire the map session. Also do not make “biometric timestamp = legal break” the model. A biometric proves the driver authenticated; it does not independently prove that the driver rested.

The existing repository already has useful pieces:

- GPS position ingestion in `src/app/api/loads/[id]/position/route.ts`
- HOS calculation in `src/lib/hos.ts`
- Append-only, server-timestamped duty entries in `src/lib/duty.ts`
- WebAuthn verification in `src/lib/webauthn.ts`
- Existing server-side approval ceremony pattern in `/api/webauthn/approve-options` and `/api/webauthn/approve-verify`
- Existing driver map and duty UI in `src/components/desk/driver-desk.tsx` and `src/components/desk/duty-panel.tsx`

The current code does **not** yet support the proposed step-up flow for driver duty actions. It currently allows the driver to post duty status directly after the normal session check.

---

# Frontend implementation prompt

Use this prompt for the frontend coding task:

```text
Implement a driver “Focus HUD” mode for the BramptonSecOps repository.

Repository:
devzephyr/BramptonSecOps

Goal:
Add a focused, low-interruption driver cockpit that uses the existing driver desk, map, load data, HOS summary, WebAuthn client utilities, and telemetry APIs.

Important product rules:
1. Never log the driver out.
2. Never revoke or expire the normal application session because of a dwell, break, or stale telemetry condition.
3. The map and read-only telemetry must remain visible.
4. The frontend must never decide that a break, HOS expiry, or authentication requirement exists. It must render the authoritative state returned by the backend.
5. No prompts, modal dialogs, vibrations, or biometric requests may appear while the vehicle is moving.
6. WebAuthn should be invoked only after the driver taps an action while the server says step-up authentication is required.
7. Do not describe biometric data as being collected. The device performs local user verification; the server receives only a WebAuthn assertion.

Focus HUD behavior:

A. Entry point
- Add a “Focus” button to each active driver/load bubble in the driver-facing UI.
- The button opens a full-screen or near-full-screen HUD route/view for the selected load.
- Preserve an explicit “Exit HUD” control.
- Do not make the HUD a separate authentication session.

B. HUD layout
Implement an OLED-friendly dark interface:
- bg-zinc-950 base
- high-contrast text
- large touch targets
- no dense tables
- no typing while moving

Top bar:
- Exit HUD
- authoritative cab state from backend:
  - ROLLING
  - STATIONARY
  - STATIONARY / DWELL
  - TELEMETRY STALE
  - AUTHENTICATION REQUIRED
- load reference

Compliance banner:
- Render only when the backend returns an active compliance action.
- Do not render any interactive compliance prompt while backend cab state is moving.
- When parked and authentication is required, show:
  - reason
  - remaining driving time or break time
  - action button
- The banner must explain that authentication is required to complete a duty action, not that the whole session expired.

Live route section:
- Reuse the existing TripMap component.
- Show origin and destination.
- Show live position and last update time.
- Show speed if available.
- Clearly display “Telemetry stale” if the backend reports stale telemetry.
- Never display a position as live when its timestamp is outside the server-defined freshness window.

Metric cards:
- HOS driving bank
- destination and dock
- reefer temperature and target
- ETA and distance if available
- sleep/rest recommendation state if provided by backend

C. Driving-state behavior
When the backend says vehicle is moving:
- Hide compliance action banners.
- Disable duty action buttons that require the vehicle to be stopped.
- Do not call WebAuthn.
- Continue refreshing read-only state.
- Keep the map visible.
- Do not use browser vibration, alert(), modal dialogs, or forced navigation.

When the backend says vehicle is stopped:
- Show dwell duration.
- If no action is required, show a quiet stationary state.
- If an action is required, show the action banner.
- Allow the driver to tap the action only if the backend says the action is currently allowed.

D. Step-up action flow
Add a client helper that:
1. Requests a challenge from the backend for a specific action.
2. Receives ceremonyId and optionsJSON.
3. Calls startAuthentication from @simplewebauthn/browser.
4. Sends ceremonyId and the WebAuthn response to the backend.
5. Refreshes authoritative driver state after success.
6. Shows a recoverable error if the driver cancels, is offline, or the challenge expires.

The action must be bound to:
- authenticated user
- load ID
- driver ID
- action type
- current server state version or state hash
- expiration time

Do not allow the frontend to send an arbitrary action such as “break complete” without the backend having issued that exact action challenge.

E. Actions
Support these action types:
- confirm_rest_start
- confirm_rest_end
- resume_driving
- correct_duty_status
- record_facility_drop

For the initial implementation, only expose the actions that the backend explicitly returns as allowed.

F. Sleep/rest warning
Do not call this a guaranteed legal sleep or break event.
Display:
- “Rest recommended”
- “Break required”
- “Sleeper berth recorded”
only when returned by the backend.

After a qualifying rest period:
- The backend must recalculate the next driving bank.
- The frontend must not simply reset a timer locally.
- The HUD should show the new remaining driving time and next reminder state returned by the server.

G. Resilience
- Poll authoritative state at a reasonable interval while the HUD is open.
- Continue showing the last known state during temporary connectivity loss, but clearly mark it as stale.
- Do not let stale client state authorize a write.
- On any write, the backend response is authoritative.
- If the server returns 409, refresh state and explain the current required action.
- If WebAuthn is unavailable, show a clear fallback/error; do not bypass the server requirement.

H. Accessibility and driver usability
- Minimum 56px touch targets.
- Avoid small text.
- Do not require typing during the trip.
- Use plain language.
- Make the most important state visible at a glance.
- Ensure the HUD works on mobile widths.
- Add tests for moving, stopped, dwell, stale telemetry, authentication required, authentication cancelled, and successful action completion.

Reuse existing components and types where possible. Do not introduce a new design system.
```

---

# Backend implementation prompt

Use this prompt for the backend and synchronization work:

```text
Implement server-authoritative driver focus-mode state and WebAuthn step-up action gating for the BramptonSecOps repository.

Repository:
devzephyr/BramptonSecOps

Goal:
Keep the driver’s normal session and read-only telemetry alive while requiring a fresh WebAuthn assertion only for specific compliance-sensitive write actions.

Non-negotiable rules:
1. Do not revoke, expire, or replace the normal session because of HOS, dwell, or telemetry state.
2. Do not add a session-revocation state machine.
3. Do not trust the frontend to decide whether authentication is required.
4. Do not trust client timestamps for duty events.
5. Do not accept a client-provided “biometric passed” boolean.
6. Do not treat a biometric timestamp alone as proof of rest.
7. All protected writes must be authorized by the backend and, when required, by a server-issued WebAuthn ceremony.
8. Existing read-only map and telemetry access must continue during connectivity problems where possible.
9. Do not bypass HOS enforcement when telemetry is received.
10. Preserve the append-only duty hash chain.

Use the existing WebAuthn implementation:
- src/lib/webauthn.ts
- src/app/api/webauthn/approve-options/route.ts
- src/app/api/webauthn/approve-verify/route.ts
- src/lib/canonical.ts
- existing WebAuthnChallenge and PendingCeremony models if they can support the action safely

Prefer reusing existing database tables. Do not add a Prisma migration unless absolutely required. If the existing PendingCeremony model cannot safely represent driver step-up actions, explain why before changing the schema.

A. Create authoritative driver state

Add a server-side function, for example:
getDriverFocusState({ orgId, driverId, loadId })

It must calculate from server-side data:
- current driver duty status
- driving milliseconds since the last qualifying break
- remaining driving time
- whether a break is owed
- current break/rest elapsed time
- vehicle speed or movement state derived from recent position pings
- dwell start and dwell duration
- telemetry freshness
- load assignment
- current load state
- destination, dock, reefer setpoint, ETA
- whether the driver is allowed to perform each action
- whether a WebAuthn step-up is required
- next recommended rest/sleeper action

Use server time only.

Define explicit states, for example:
- moving
- stopped_short
- stopped_dwell
- stopped_break_required
- stopped_rest_in_progress
- telemetry_stale
- arrived
- action_required

Do not infer “rest” solely from GPS stoppage. A stopped truck may be loading, fueling, inspecting, waiting at a dock, or handling paperwork.

B. Movement and dwell detection

Use recent PositionPing records and server timestamps.
- Define a single freshness window.
- Define a single movement threshold.
- Define a single dwell threshold.
- Ignore GPS jitter under the configured minimum distance.
- If telemetry is stale, do not claim the truck is safely stationary.
- Do not let a stale position authorize a duty transition.
- If the client has not posted telemetry, the server must remain conservative.

For every telemetry POST:
1. Authenticate the normal session.
2. Confirm the user is the assigned driver or co-driver under existing load rules.
3. Validate coordinates.
4. Store or update the position as currently implemented.
5. Derive movement state on the server.
6. If movement indicates driving, append a GPS-sourced driving entry when appropriate.
7. If driving is past the limit, preserve the existing violation alert behavior.
8. Return the complete authoritative focus state.

C. Add a state endpoint

Add:
GET /api/drivers/:driverId/focus?loadId=...

Requirements:
- Driver can read only their own state.
- Managers can read driver state for their organization.
- Every response must be derived from current server data.
- Return a monotonically useful state representation such as:
  - stateVersion
  - generatedAt
  - telemetryAt
  - serverNow
  - cabState
  - speed
  - dwellMs
  - hos summary
  - rest summary
  - requiredAction
  - allowedActions
  - load summary
- The client must not be able to submit stateVersion as proof of compliance. It is only for detecting stale UI.

D. Implement step-up challenge issuance

Add an endpoint such as:
POST /api/drivers/:driverId/step-up/options

Request:
{
  loadId?: string,
  action: "confirm_rest_start" |
          "confirm_rest_end" |
          "resume_driving" |
          "correct_duty_status" |
          "record_facility_drop"
}

Server must:
1. Authenticate the normal session.
2. Confirm the session user is the same driver for driver actions.
3. Confirm organization and load ownership.
4. Recompute focus state.
5. Confirm the requested action is currently allowed.
6. Refuse actions while moving when they require the truck to be stopped.
7. Create a short-lived, one-use ceremony bound to:
   - orgId
   - userId
   - driverId
   - loadId
   - action
   - server-generated nonce
   - current state hash or state version
   - expiration
8. Generate a WebAuthn authentication challenge with userVerification required.
9. Return ceremonyId and optionsJSON.

The client must never be allowed to choose an action that the server did not authorize.

E. Implement step-up verification and action execution

Add:
POST /api/drivers/:driverId/step-up/verify

Request:
{
  ceremonyId,
  response
}

Server must:
1. Authenticate the normal session.
2. Load the ceremony and verify it is:
   - present
   - unused
   - unexpired
   - owned by the current user
   - in the same organization
3. Verify the WebAuthn assertion using the stored challenge, expected origin, expected RP ID, and the current user’s credential.
4. Require userVerified.
5. Atomically burn the ceremony so it cannot be replayed.
6. Recompute current focus state inside the transaction or immediately before mutation.
7. Refuse the action if:
   - the vehicle began moving
   - telemetry became stale
   - the load changed ownership
   - the HOS state changed incompatibly
   - the ceremony’s bound state no longer matches
8. Perform only the action bound to the ceremony.
9. Append the resulting duty/custody event using the server timestamp.
10. Preserve the hash chain.
11. Return the updated authoritative focus state.

Do not accept an action name in the verification request as authority. The action must come from the stored ceremony.

F. Duty actions

For confirm_rest_start:
- Require the vehicle to be stationary.
- Require fresh telemetry.
- Do not automatically classify the driver as off duty based solely on the biometric.
- Record a server-timestamped attestation or duty status according to the existing duty model.
- Store location and load context when available.
- Clearly distinguish source as a step-up/attested source rather than GPS.

For confirm_rest_end:
- Require the vehicle to remain stationary or require an explicit safe transition rule.
- Recompute the elapsed qualifying non-driving period.
- Do not allow the client to claim a longer rest duration than server time proves.
- Return the recalculated HOS summary.

For resume_driving:
- Require fresh telemetry and a valid driver assignment.
- Refuse if a break is still owed.
- Append driving status with server time.
- The first subsequent movement may also be recorded by GPS according to existing behavior.
- Avoid duplicate status entries when the same status is already active.

For correct_duty_status:
- Require explicit target status and reason in the step-up options request.
- Bind the exact target status and reason into the ceremony.
- Do not permit an arbitrary correction during verification.
- Preserve append-only correction semantics.

For record_facility_drop:
- Continue using the existing custody endpoint behavior.
- If step-up is required, bind the destination facility, load ID, and seal-related fields into the ceremony.
- Revalidate the seal and load state before committing.
- Never allow the frontend to change the destination after authentication.

G. Sleep/rest warnings

Implement separate server-derived warning fields rather than resetting a client timer.

Return:
- drivingRemainingMs
- breakRequired
- breakRemainingMs
- restInProgress
- restElapsedMs
- nextBreakWarningMs
- sleeperBerthRecommended
- sleeperBerthRequired only if the compliance rules actually support that determination

After a qualifying break or rest:
- Recompute the driving bank from the duty entries.
- Recompute the next warning threshold.
- Never reset the timer in React.
- The next warning must be based on the new server-derived stretch.

Do not claim that the system proves sleep. It can record a driver attestation and stationary interval, but it cannot prove the driver was asleep.

H. Polling versus WebSocket

Do not make WebSockets necessary for correctness.
- The backend must enforce all rules on telemetry and action requests.
- The HUD may poll the focus endpoint.
- WebSockets or server push may be added as an optimization only.
- If a push event is missed, the next poll must recover the correct state.
- No frontend event may be the only trigger for compliance enforcement.

I. Tests

Add server tests for:
- moving vehicle cannot start rest action
- stale telemetry cannot authorize rest completion
- dwell state is derived by backend
- frontend cannot force breakOwed
- replayed ceremony fails
- expired ceremony fails
- ceremony for another driver fails
- ceremony for another load fails
- state changes between options and verify fail safely
- vehicle begins moving after options issuance
- resume driving fails while break remains owed
- server time is used instead of client time
- duplicate telemetry does not duplicate duty entries
- qualifying rest recalculates the next driving bank
- telemetry-triggered driving is still recorded
- hash chain remains intact
- normal session remains valid throughout all of the above
```

## Important correction to the proposed state machine

This part should be removed:

```text
Backend revokes driver's write token
Session State -> ATTESTATION_REQUIRED
```

Replace it with:

```text
Backend derives required action
Normal session remains valid
Only the protected write action requires step-up authentication
```

The map can continue using the normal authenticated session. The server simply rejects an unauthorized duty mutation with a response such as:

```json
{
  "error": "step_up_required",
  "action": "confirm_rest_start",
  "cabState": "stopped_dwell",
  "focusState": {
    "dwellMs": 420000,
    "telemetryFresh": true,
    "breakRequired": false
  }
}
```

The frontend then requests a challenge for that exact action.

## What happens after the first break?

The timer must not be reset in the browser.

The server calculates:

```text
Driving stretch 1
    7h 42m driving
    35m qualifying non-driving period

Driving stretch 2 begins
    driving bank resets on the server
    next warning is calculated from the new stretch
```

For the next cycle, the backend again returns:

- Current driving time
- Remaining time
- Whether a break is owed
- Whether the driver is currently resting
- How long the current rest has lasted
- Whether the next action requires authentication

The UI only displays those values.

## Warning for sleep/rest

Yes, you can show a warning, but use careful language:

- **“Break due soon”** — driving-limit warning.
- **“Rest period in progress”** — server sees a qualifying non-driving interval.
- **“Rest confirmation required”** — driver must attest.
- **“Sleeper berth selected”** — driver explicitly chose that status.
- Avoid “sleep detected.”
- Avoid claiming the app proves the driver slept.

A good HUD sequence is:

```text
6h 45m driving
Break due in 1h 15m

↓ later

7h 30m driving
Plan a safe rest stop soon

↓ parked

Stationary for 6m
Confirm rest period when ready

[ AUTHENTICATE TO CONFIRM REST ]

↓ after successful attestation

Rest period: 18m
Remain stopped for 12m more

↓ after qualifying rest

Driving bank reset
Next break reminder calculated by server
```

The existing HOS implementation currently uses an eight-hour driving threshold and a 30-minute qualifying non-driving period, but its own comments state that it is not a complete compliant ELD implementation and does not model all daily or cycle limits. Treat this feature as an auditable driver workflow until the full regulatory/compliance scope is independently validated.

### Want me to…
<!-- copilot:suggestions -->
1. Hand this frontend and backend plan off to the coding agent to implement it and open a pull request.
2. Turn this into a smaller demo-safe implementation using the existing database tables and polling only.
3. Draft the exact API types, state machine, and test cases before any code changes.
