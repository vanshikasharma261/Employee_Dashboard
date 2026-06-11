# API Contracts

## Authentication

POST /auth/login

POST /auth/refresh

POST /auth/logout

---

## Employee

GET /employees

GET /employees/:id

POST /employees

PATCH /employees/:id

PATCH /employees/:id/status

DELETE /employees/:id

GET /employees/me

---

## Department

GET /departments

POST /departments

PATCH /departments/:id

DELETE /departments/:id

---

## Assets

GET /assets

GET /assets/:id

POST /assets

PATCH /assets/:id

DELETE /assets/:id

POST /assets/:id/allocate

POST /assets/:id/remove

POST /assets/:id/maintenance

POST /assets/:id/trash

---

## Asset Requests

GET /asset-requests

GET /asset-requests/:id

POST /asset-requests

PATCH /asset-requests/:id

POST /asset-requests/:id/approve

POST /asset-requests/:id/reject

POST /asset-requests/:id/complete
