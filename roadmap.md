# Device pairing
- [x] Generate random LK-ABC-123 / PT-ABC-123 codes with ten-minute approval.
- [x] Extend secure enrollment and admin revocation to assisted points.
- [x] Persist tablet pairing and reopen directly to the keypad.
- [x] Test pairing, reopening, revocation and document device setup.

# Monthly code rotation
- [x] Persist editable guest-only monthly codes, reuse and validity settings.
- [x] Rotate single-cycle stays on return and block duplicate deposits.
- [x] Verify monthly flows, time limits, history and UI persistence with isolated SQL fixtures and a temporary UI key.

# Monthly code editing after pickup
- [x] Verify the observed pickup against Argentina time and test the 15:00 boundary.
- [x] Allow monthly code editing after pickup and replace frequency dropdown with radio buttons.
- [x] Verify editing persistence in the signed-in panel without moving real keys.

# Code validity audit
Rule: chosen dates/hours must gate access consistently; active monthly codes remain editable after pickup; frequency uses radios.
- [x] Host Info and Codes: shared edit eligibility and monthly editor, read and exercised signed in.
- [x] Monthly editor: guest-only role, radios and independent date/time limits; saved unchanged settings and reloaded.
- [x] Pro creation/editor/list: retained limits for reusable codes, enabled editing limits/frequency and displayed partial limits; read and exercised without saving.
- [x] Admin exchanges: monthly picked-up editing and final-hour field; read.
- [x] Assisted terminal, locker API and authenticated validator: all call the shared validation; read.
- [x] Monthly SQL validation and stay creation: Argentina clock, closed-code rejection and serialized rotation; read live definitions and tested isolated fixtures.
- [x] Pro server validation: corrected UTC comparisons and prevented failed operations consuming uses; read and regression tested.
- [x] Other-plan stay validation: now applies configured dates/hours before pickup; read and regression tested.
- [x] Boarding pass and public lookup: exposed final time and accepted existing Pro/rotated stay references; read, exercised public UI and tested isolated final-time reads.
- [x] Expiration/notification background flow: only one-use 48-hour expiration, no change to monthly limits or settled records; read function and caller.