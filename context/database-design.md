# Database Design

## Main Entities

### Employee

Stores employee information.
There are 2 roles - Admin , Employee

Relationships:

- belongs to Department
- reports to Employee
- has many Assets
- has many Asset Requests

---

### Department

Stores departments.

Examples:

- Engineering
- HR
- Finance
- Marketing

---

### Asset

Stores company assets.

Relationships:

- optionally belongs to Employee

---

### AssetAllocationHistory

Stores allocation history.

Purpose:

- Track every asset assignment
- Track asset returns
- Maintain audit records

---

### AssetRequest

Stores employee requests.

Relationships:

- belongs to Employee
- optionally references Asset

---

## Suggested Database Relationships

Department

1 → Many Employees

Employee

1 → Many Employees (Reporting Manager)

Employee

1 → Many Assets

Employee

1 → Many Requests

Asset

1 → Many Allocation History Records

Asset

0..1 → Employee

---

## Soft Delete Strategy

Avoid hard deletes.

Use:

- is_deleted
- deleted_at

for future-proofing and auditing.
