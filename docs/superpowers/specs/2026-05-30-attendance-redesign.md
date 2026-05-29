# Attendance Module Redesign — Design Spec

**Date:** 2026-05-30
**Scope:** Teacher attendance only (student attendance is a separate future module)
**Page:** `frontend-svelte/src/routes/(app)/school/attendance/+page.svelte`

---

## Goals

1. Redesign the attendance page with proper design-system tokens (no raw hex, no inline styles).
2. Add GPS auto-detect + interactive Leaflet map to the geofence settings card.
3. Promote the calendar from a per-teacher modal to a first-class tab on the main page.
4. Keep all existing API calls and business logic — only the UI layer changes.

---

## Layout (Option A — approved)

```
┌─────────────────────────────────────────────────────┐
│  [▼] School Geofence        [● Locked / Editable]   │
│  [ Leaflet map — school pin + radius circle ]        │
│  Lat [__]  Lng [__]  Radius [__]  [📍 Use GPS]      │
│  [Save Geofence]            [Lock / Unlock]          │
└─────────────────────────────────────────────────────┘

[ Total ] [ Present ] [ Absent ] [ % ]    ← stat bar

[ Daily List ]  [ Calendar ]              ← tabs

── Daily List ──────────────────────────────────────────
  Date: [picker]   [↓ Download]

  Teacher card:
    Avatar initial | Name + Position | Status badge
    [Present ✓] [Absent ✗] [Open Calendar →]
    Monthly metrics: P / A / L / HD / % / Leave balance

── Calendar ────────────────────────────────────────────
  [< Prev]  Month Year  [Next >]   [Year ▾]
  7-col grid (Mon–Sun)
  Each cell: date number + attendance % badge (green/yellow/red)
  Click cell → slide-over: all teachers for that day

── Teacher slide-over (right panel, fixed) ─────────────
  Teacher name + position
  Monthly calendar grid (personal)
  Click day cell → inline edit: status select + reason + save
  Leave balance chips
```

---

## Components

### New files

| Component | Responsibility |
|---|---|
| `lib/components/attendance/GeofenceCard.svelte` | Collapsible card: Leaflet map + GPS button + lat/lng/radius inputs + save/lock |
| `lib/components/attendance/AttendanceStatBar.svelte` | 4 stat cards: Total, Present, Absent, % |
| `lib/components/attendance/TeacherCard.svelte` | Single teacher row: avatar, status badge, mark buttons, monthly metric grid, open-calendar button |
| `lib/components/attendance/SchoolCalendar.svelte` | School-wide month grid: each day cell shows attendance %, click → emits selected date |
| `lib/components/attendance/TeacherCalendarPanel.svelte` | Slide-over panel: personal calendar, inline date edit, leave balance chips |

### Modified files

| File | Change |
|---|---|
| `routes/(app)/school/attendance/+page.svelte` | Full rewrite — imports new components, owns all state and fetch logic |

---

## Data Flow

All existing API endpoints are reused unchanged.

```
schoolId available →
  GET /api/schools/:id                              → geofence settings
  GET /api/attendance/:schoolId/:date?position=Teacher → daily teacher list
  GET /api/staff/:schoolId                          → teacher roster
  GET /api/attendance/report/:schoolId?startDate&endDate → monthly records
  GET /api/leaves/school/:schoolId                  → leave records

Tab switch to Calendar →
  same monthly data, regrouped by date (no new API call)

GPS button →
  navigator.geolocation.getCurrentPosition()
  → fills geoLatitude, geoLongitude reactive state

Leaflet map →
  $effect: lat/lng/radius change → update marker position + circle radius
  map click event → update geoLatitude, geoLongitude inputs

Mark attendance →
  POST /api/attendance  { staffId, schoolId, date, status }

Save calendar edit →
  POST /api/attendance  { staffId, schoolId, date, status, remarks }

Save geofence →
  PUT  /api/schools/:id/location  { latitude, longitude, radiusMeters }

Toggle geofence lock →
  PATCH /api/schools/:id/location-lock  { locked: bool }
```

---

## State

```ts
// Tab
let activeTab = $state<'list' | 'calendar'>('list')

// Geofence
let geofenceOpen = $state(true)           // collapsible
let geoLatitude  = $state('')
let geoLongitude = $state('')
let geoRadiusMeters = $state('200')
let geoLocked    = $state(false)
let savingGeofence = $state(false)

// Daily list
let selectedDate = $state(today)
let teachers = $state<TeacherAttendance[]>([])
let loading  = $state(false)

// Monthly
let selectedYear        = $state(now.getFullYear())
let selectedMonthNumber = $state(now.getMonth() + 1)
let monthlyStats        = $state<TeacherMonthlyStat[]>([])
let teacherLeavesMap    = $state<Record<string, LeaveRecord[]>>({})
let teacherAttendanceMap = $state<Record<string, AttendanceRecord[]>>({})

// Slide-over
let slideoverTeacher = $state<TeacherCalendarTarget | null>(null)

// Calendar edit (inside TeacherCalendarPanel)
let calendarEditingDate   = $state<string | null>(null)
let calendarEditStatus    = $state<AttendanceStatus>('Present')
let calendarEditReason    = $state('')
let calendarSaving        = $state(false)
```

All existing fetch functions (`fetchSchoolLocation`, `fetchAttendance`, `fetchMonthlyStats`, `markAttendance`, `saveGeofence`, `toggleGeofenceLock`, `saveCalendarEdit`) are preserved with identical logic.

---

## Design System Rules

- Colors: `bg-primary`, `text-primary`, `bg-success`, `bg-destructive`, `bg-warning`, `bg-card`, `text-muted-foreground`, `border-border` only — no raw hex.
- Typography: `font-heading` (Space Grotesk) for headings, default Inter for body.
- Runes: `$state`, `$derived`, `$derived.by`, `$effect` — no `$:` or `export let`.
- Svelte snippets for repeated inline patterns.
- `lucide-svelte` for all icons.

---

## Map Implementation

- Package: `leaflet` + `@types/leaflet` (already in OSS ecosystem, no API key)
- Tiles: OpenStreetMap (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`)
- Init in `$effect` inside `GeofenceCard.svelte` after the map div mounts
- Cleanup: `map.remove()` in effect cleanup
- Click handler: `map.on('click', e => { geoLatitude = e.latlng.lat; geoLongitude = e.latlng.lng })`
- Default zoom: 15. If no coords yet, center on India (20.5937, 78.9629), zoom 5.

---

## Out of Scope

- Student attendance (separate future page)
- Export/download implementation (already stubbed as "coming soon")
- Backend changes — zero backend modifications required
- Real-time attendance updates (polling or websockets)
