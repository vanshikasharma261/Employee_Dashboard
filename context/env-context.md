# Environment Variables

## Backend

DATABASE_URL

PostgreSQL connection string.

Example:

postgresql://user:password@localhost:5432/employee_management

---

JWT_SECRET

Used for signing JWT tokens.

---

JWT_EXPIRES_IN

Example:

7d

---

PORT

Backend server port.

Default:

3000

---

## Frontend

VITE_API_URL

Backend API URL.

Example:

http://localhost:3000/api

---

## Rules

- Never hardcode secrets.
- Always access configuration through ConfigService.
- Use validation during application startup.
- Missing required variables should stop application boot.
