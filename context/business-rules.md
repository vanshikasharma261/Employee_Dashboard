# Business Rules

## Employee Creation

When an employee is created:

- employee_id is generated automatically uuid by db
- status is automatically set to WORKING
- official_email must be unique
- personal_email must be unique
- department must exist
- reporting manager must exist if selected

---

## Employee Status Rules

Available statuses:

- WORKING
- ON_NOTICE
- RESIGNED
- TERMINATED

Rules:

- Only Admin can change status
- New employees start as WORKING
- TERMINATED employees cannot receive new assets
- RESIGNED employees remain in the database
- Employee history must never be deleted

---

## Reporting Manager Rules

- Reporting manager references another employee
- Employee cannot report to themselves
- Reporting manager must have WORKING status
- Reporting manager field is optional

---

## Asset Rules

Asset categories:

- Laptop
- Mouse
- Keyboard
- Headset
- Earphone
- Mobile Phone
- Screen
- Cooling Pad
- iPad

Asset statuses:

- AVAILABLE
- ALLOCATED
- MAINTENANCE
- TRASHED

Rules:

- Asset serial number must be unique
- TRASHED assets cannot be reused
- MAINTENANCE assets cannot be allocated
- Only AVAILABLE assets can be allocated

---

## Asset Allocation Rules

Before allocation:

- Employee must be WORKING
- Asset must be AVAILABLE

After allocation:

- Asset status becomes ALLOCATED
- Asset owner is stored

When asset is removed:

- Allocation record is removed
- Asset becomes AVAILABLE

---

## Asset Request Rules

Employees can create requests for:

- New Asset
- Asset Removal
- Asset Maintenance

Request lifecycle:

PENDING
→ APPROVED
→ COMPLETED

or

PENDING
→ REJECTED

Rules:

- Employees can only create requests for themselves
- Employees cannot approve requests
- Admin can approve or reject requests
- Completed requests become read-only
