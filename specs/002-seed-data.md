# Feature Specification: Initial Database Seed Data

## Overview

Create the initial database seed system for the Employee Management Dashboard.

This feature is responsible for generating and inserting dummy data required for local development, testing, and application demonstration.

The seed process should populate the database with realistic departments, employees, administrators, and company assets while respecting all schema constraints and relationships.

This feature only focuses on creating and organizing seed data. It should not introduce any new database models, modify the schema, or implement business logic.

---

## Requirements

### Seed File Setup

Create a centralized Prisma seed process that inserts initial development data into the database.

Requirements:

- Create a Prisma seed entry file.
- Seed data must be executable using Prisma's seed mechanism.
- Seed execution should populate the database with predefined development data.
- Seed files should only contain data generation and insertion logic.

---

### Schema Compliance

Requirements:

- All seed data must follow the latest schema defined in:
  @backend/prisma/schema.prisma

- All relationships must be valid.
- All enum values must match schema definitions.
- All required fields must be populated.
- All unique constraints must be respected.

---

### Seed Data Structure

Organize seed data into dedicated files.

Required files:

```text
prisma/

├── seed.ts
├── seed-data/
│   ├── employees_seed_data.ts
│   ├── assets_seed_data.ts
│   └── departments_seed_data.ts
```

## Responsibilities:

#### employees_seed_data.ts

Contains employee and administrator seed records only.

#### assets_seed_data.ts

Contains company asset seed records only.

#### departments_seed_data.ts

Contains department seed records only.

#### seed.ts

Responsible for:

- Loading seed data
- Inserting records
- Establishing relationships
- Executing seed operations in the correct order

---

### Department Seed Data

Create realistic company departments.

Suggested departments:

- Engineering
- Human Resources
- Finance
- Marketing
- Product
- Operations

Requirements:

- Department names must be unique.
- Department records must satisfy schema constraints.

---

### Employee Seed Data

Create realistic employee records for development purposes.

Requirements:

- Include multiple employees across different departments.
- Include reporting manager relationships where applicable.
- Include valid personal and official email addresses.
- Use realistic employee names and data.
- All employees must satisfy schema requirements.

---

### Administrator Account

Create one pre-seeded administrator account.

Requirements:

First Name:

```text
HR
```

Last Name:

```text
Admin
```

Role:

```text
ADMIN
```

Password:

```text
Admin@123
```

Requirements:

- Password must never be stored in plain text.
- Password must be hashed using bcrypt before insertion.
- Seed logic should generate the hash during execution or use a pre-generated bcrypt hash.
- Administrator account must satisfy all schema constraints.

---

### Asset Seed Data

Create realistic company assets.

Asset categories should follow schema definitions.

Examples:

- Laptops
- Keyboards
- Mice
- Headsets
- Screens
- Mobile Phones
- iPads
- Cooling Pads

Requirements:

- Asset serial numbers must be unique.
- Assets must satisfy schema constraints.
- Asset statuses should represent realistic inventory data.

---

### Asset Allocation

This feature does not create asset allocations.

Requirements:

- Do not assign assets to employees.
- Do not create allocation history.
- Do not create allocation tracking records.

These will be implemented in future features.

---

### Asset Requests

This feature does not create asset requests.

Requirements:

- Do not seed asset requests.
- Do not seed request history.
- Do not seed approval records.

These will be implemented in future features.

---

### Seed Execution Order

Data must be inserted in a dependency-safe order.

Recommended order:

1. Departments
2. Employees
3. Assets

Relationship references must be resolved correctly.

---

## References

### Database Schema

```text
@backend/prisma/schema.prisma
```

### Database Standards

```text
context/database-design.md
```

---

## Notes

### Password Security

- Use bcrypt for password hashing.
- Never store plain text passwords.
- Never commit plain text passwords to database records.

---

### Seed Data Purpose

Seed data exists for:

- Local development
- Testing
- Demo environments

It is not intended for production use.

---

### Data Quality

Seed data should:

- Look realistic
- Respect business rules
- Cover multiple departments
- Cover multiple employee roles
- Cover multiple asset categories

---

## Definition of Done

- Prisma seed system configured.
- Seed entry file created.
- Department seed data created.
- Employee seed data created.
- Administrator account created.
- Administrator password hashed using bcrypt.
- Asset seed data created.
- All data follows schema constraints.
- All relationships resolve successfully.
- Seed executes successfully.
- No asset allocations created.
- No asset request records created.
- Seed data committed to source control.
- Feature status updated in `context/current-feature.md`.
- Implementation history added to `context/current-feature.md`.
