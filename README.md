# ViLek

ViLek is a digital expense and claim management application designed for flight crew.

![ViLek Logo](Branding/logo.png)

## Overview

ViLek helps crew members:

- Track flights and crew assignments
- Record flight-related expenses
- Store receipts
- Organize expense records
- Create and manage claims
- Track claim status
- View expense and claim information

## Product

![ViLek](Branding/banner.png)

## Dashboard

The dashboard provides an overview of flights, expenses, claims, approvals, recent activity, and expense summaries.

![ViLek Dashboard](docs/images/vilek-dashboard.png)

## Technology Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Zod

## Architecture

ViLek is implemented as a full-stack Next.js application.

```text
UI
 |
Server Actions / Route Handlers
 |
Services
 |
Repositories
 |
Prisma
 |
PostgreSQL
```

The application follows separation of concerns so that UI components do not directly contain database access logic.

## Domain Model

The core relationship is:

```text
CrewMember
    |
    | assigned through
    v
FlightCrew
    |
    +-- Flight
    +-- Role
    |
    +-- Expense
            |
            +-- Receipt
```

### CrewMember

Represents a person who is part of the crew.

A crew member has a crew type such as:

- Flight Crew
- Cabin Crew

### FlightCrew

Represents the assignment of a crew member to a flight.

The `role` is stored in `FlightCrew` because a person's role applies to their assignment on a particular flight.

For example:

```text
CrewMember
    Siva
    Crew Type: Flight Crew

Flight
    VL101

FlightCrew
    Crew Member: Siva
    Role: Captain
```

### Expense

An expense belongs to a `FlightCrew` assignment.

```text
Expense -> FlightCrew -> CrewMember
                     -> Flight
                     -> Role
```

The expense does not independently store both `crewMemberId` and `flightId` as ownership relationships.

## Database Integrity

Important business rules should be enforced by the database where appropriate.

For example, an invalid combination such as:

```text
Cabin Crew + Captain
```

should not be allowed.

Valid role assignments should be determined by the finalized domain model and enforced at the database level where practical.

## Project Structure

```text
vilek/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
│
├── docs/
│   └── images/
│       ├── vilek-logo.png
│       ├── vilek-banner.png
│       └── vilek-dashboard.png
│
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── expenses/
│   │   ├── receipts/
│   │   ├── claims/
│   │   ├── flights/
│   │   ├── reports/
│   │   └── settings/
│   │
│   ├── components/
│   │
│   ├── server/
│   │   ├── expenses/
│   │   ├── receipts/
│   │   ├── claims/
│   │   └── flights/
│   │
│   └── lib/
│       ├── db/
│       ├── auth/
│       └── storage/
│
├── prisma.config.ts
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

Install:

- Node.js
- npm
- PostgreSQL

### Install dependencies

```bash
npm install
```

### Configure the database

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/vilek"
```

Update the connection string for your PostgreSQL installation.

### Generate Prisma Client

```bash
npx prisma generate
```

### Run migrations

```bash
npx prisma migrate dev
```

### Start the application

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:3000
```

## Development

The project is being developed incrementally.

Current focus:

1. Domain model
2. Database schema
3. Prisma configuration
4. Application structure
5. Dashboard
6. Expense management
7. Receipt management
8. Claims
9. Flight management
10. Authentication and authorization
11. Reporting

## Roadmap

### Expenses

- [ ] Create expense
- [ ] Edit expense
- [ ] Delete expense
- [ ] Expense categories
- [ ] Expense details
- [ ] Expense totals

### Receipts

- [ ] Upload receipt
- [ ] Store receipt
- [ ] View receipt
- [ ] Attach receipt to expense

### Claims

- [ ] Create claim
- [ ] Add expenses to claim
- [ ] Submit claim
- [ ] Track claim status
- [ ] Approval workflow

### Flights

- [ ] Manage flights
- [ ] Assign crew
- [ ] Manage crew roles
- [ ] View flight history
- [ ] View flight expenses

### OCR

Future versions may support:

- [ ] Receipt OCR
- [ ] Merchant extraction
- [ ] Date extraction
- [ ] Amount extraction
- [ ] Automatic expense creation

### Reports

Future versions may support:

- [ ] Expense reports
- [ ] Claim reports
- [ ] Flight expense reports
- [ ] Data export

## License

License information will be added when the project license is finalized.
