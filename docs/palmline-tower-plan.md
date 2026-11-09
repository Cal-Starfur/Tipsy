# Palmline Tower interior build-out (plan, 2026-11-09)

Today: a 190-high podium (PALMLINE_PLAN) with Coral Cafe and Marina Deli either side of the lobby, and a 12-floor glass tower on it.
The shops and the lobby are lit rooms painted behind their glass (shopRoomPaint, lobbyRoomPaint); nobody can go in, and the doors are painted.

Build in this order, one item per session, each on the walk-in kit (walkinDefine, openings, walkinStaff):

1. **Lobby** as a real walk-in room: reception, security desk, four lifts, bench, mail wall. Staff: receptionist and guard in uniform. Tenants and couriers come and go. Sliding doors (slideDoors) for the two door pairs; the revolving door stays painted. Delivery hand-over at the desk. People who talk to Tipsey meet him face to face (meetWalk/meetTick).
2. **Coral Cafe and Marina Deli** as real rooms, reusing the mall's coffee-roaster and deli fittings; a barista and a deli clerk. Their door pairs become slideDoors too.
3. **Lifts**: the garage/hospital lift kit, stops at the lobby, the podium roof terrace and the tenant floors; floor changes fade as at Marina General.
4. **Tenant floors**, three or four of the twelve: an office suite, a dental practice, a small newsroom or studio, a gym on the podium roof. Each has a front desk and staff. The rest read as lit offices from outside. (Tenants to be chosen by Sir.)
5. **Roof and crown**: plant room on the crown floor; the mast's red light at night.
6. **Night**: walkinNightBoxes for each room; the lobby and shops lit after dark.

Rules for all of it: rooms cached and culled off screen; works in web and Reddit builds; no saved state needed.
