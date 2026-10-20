# ViLek — Flight Operations Phase 1

## Workspace boundary

Flight Operations owns operational flight and crew data. Maintain these records from `/operations/*`, not the Administration workspace. The previous `/admin/*` pages for flights, crew members, crew designations, airlines, and airports now redirect to their corresponding Flight Operations pages for compatibility.

Administration remains responsible for identity and access, finance reference data, system settings, file types, general audit logs, and technical outbox operations.

## Pages

- `/operations` — Flight Operations overview
- `/operations/flights` — flight records
- `/operations/flight-crew` — flight crew assignments
- `/operations/crew-members` — crew records
- `/operations/crew-designations` — crew designation reference data
- `/operations/airlines` — airline reference data
- `/operations/airports` — airport reference data

All pages under `/operations` are protected by the `FLIGHT_OPERATIONS_MANAGER` role at the Operations layout boundary.

## Dedicated APIs

- `/api/operations/flights` and `/api/operations/flights/options`
- `/api/operations/flight-crew` and `/api/operations/flight-crew/options`
- `/api/operations/crew-members`
- `/api/operations/crew-designations`
- `/api/operations/airlines`
- `/api/operations/airports`

The collection endpoints reuse validated resource schemas and services; item endpoints support update/deactivation. Every Operations endpoint independently requires `FLIGHT_OPERATIONS_MANAGER`.

## New Flight Operations tables

The schema also includes crew designation eligibility, qualification types and crew qualifications, designation qualification requirements, default and per-flight crew complement requirements, Flight Operations settings, assignment audit events, qualification alerts, batch-request idempotency records, and audit export events. Dedicated administrative/operational screens for these tables are a separate implementation step and should be placed in Flight Operations unless they are global system controls.
