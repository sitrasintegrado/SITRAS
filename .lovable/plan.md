

## Plan: Restructure Marcador Portal with Fixed Trips and New Booking Flow

### Summary

Redesign the Marcador portal to work with a concept of **"Fixed Trips"** (viagens fixas recorrentes) and a new booking flow where the Marcador selects a patient, date, and assigns them to an existing trip, rather than creating trips from scratch each time.

### Key Concepts

1. **Fixed Trips** - Predefined recurring trips (Ônibus 4h30, Ônibus 9h30, Hemodiálise, Tapiraí) that exist as templates
2. **Booking Flow** - Marcador selects patient → date → consult info → picks a trip → sets boarding location → saves
3. **Boarding Location** - New field on `trip_passengers` for where the patient boards (quick-select: "Rodoviária de Tapiraí", "Rodoviária do Turvo", or free text)

---

### Database Changes

**1. New table: `fixed_trips`** - Stores recurring trip templates managed by admin/gestor

| Column | Type | Description |
|---|---|---|
| id | uuid PK | |
| label | text | Display name (e.g. "Ônibus 4h30") |
| departure_time | text | Fixed time (e.g. "04:30") |
| default_destination | text | Default destination |
| is_active | boolean | Whether it's currently available |
| created_at | timestamptz | |

RLS: admin/gestor can manage; marcador can read active ones.

**2. Add columns to `trip_passengers`:**
- `boarding_location` (text, default '') - Where the patient boards
- `consult_time` (text, default '') - Patient's individual consult time
- `consult_location` (text, default '') - Patient's individual consult location (hospital)

**3. Add column to `trips`:**
- `fixed_trip_id` (uuid, nullable) - References the fixed trip template it was generated from

**4. Seed initial fixed trips:** Ônibus 4h30, Ônibus 9h30, Hemodiálise, Tapiraí

---

### Frontend Changes

**1. Rewrite `MarcadorPortal.tsx` main screen:**

- **Date filter** at the top (defaults to today)
- **List trips for the selected date**, grouped/filtered by fixed trip
- Each trip card shows passengers with boarding location
- **"Nova Marcação"** button opens the booking dialog

**2. New Booking Dialog (replaces current "Nova Viagem" dialog):**

Flow:
1. Select/search patient (existing `BuscaPaciente`)
2. Select date
3. Inform consult time
4. Select consult location (autocomplete with common values: "Ame de Sorocaba", "Ame de Itu", "Adib Sorocaba" + free text)
5. Select destination (autocomplete: "Sorocaba", "Itu", "São Paulo" + free text)
6. Select trip to assign to (dropdown showing available trips for that date, auto-creating from fixed_trips if none exist yet)
7. Select boarding location (quick buttons: "Rodoviária de Tapiraí", "Rodoviária do Turvo" + free text input)
8. Companion checkbox + PCD checkbox
9. Save

**3. Auto-create trips from fixed templates:**
When the Marcador selects a date and there are no trips yet for that date from the fixed templates, the system auto-creates them (or creates on-demand when the first patient is booked).

**4. Keep existing tabs** (Concluídas, Solicitações, Notificações) with minor adjustments.

**5. Trip filter on main screen:** Allow filtering by specific trip (e.g. "Ônibus 4h30" only).

---

### Technical Details

- The `fixed_trips` table is managed by admin/gestor in a simple admin UI (can be added to the Veículos page or a new settings section)
- When a Marcador books a patient for a date+fixed_trip combination, the system checks if a `trips` row already exists for that date/fixed_trip. If not, it creates one with status "Aguardando Motorista"
- The consult_time and consult_location move from trip-level to passenger-level (since different patients on the same bus may have different appointments)
- Boarding location options are hardcoded as suggestions but allow free text
- A patient can appear in multiple trips on the same day (ida + volta)

### Files to Create/Modify

| File | Action |
|---|---|
| Migration SQL | Create `fixed_trips` table, add columns to `trip_passengers` and `trips`, seed data, add RLS |
| `src/pages/MarcadorPortal.tsx` | Major rewrite - new booking flow, date-based view, trip grouping |
| `src/types/index.ts` | Add `FixedTrip` type, update `TripPassenger` with new fields |
| `src/hooks/use-supabase-data.ts` | Add `useFixedTrips` hook, update trip passenger mapping |
| `src/components/BookingDialog.tsx` | New component for the Marcador booking flow |

