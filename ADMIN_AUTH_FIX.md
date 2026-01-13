# Admin API Authentication Fix

## Problem
Admin APIs were returning "Please log in to complete this action." even after successful admin login, despite the session cookie being set in Postman.

## Root Cause
- **Login Flow**: Uses **session-based authentication** with `sessionId` cookie
- **Admin Routes (BEFORE)**: Used **JWT-based authentication** with `authenticate` middleware
- **Mismatch**: Admin routes expected JWT tokens in Authorization header, but login only sets session cookies

## Solution
Updated all admin routes to use **session-based authentication** matching the working `/auth/profile` endpoint pattern.

### Changed Files
All admin route files now use `validateLoginSession` middleware instead of `authenticate`:

1. **src/routes/admin/customers.ts**
   - ❌ Before: `authenticate` + `requireAdmin`
   - ✅ After: `validateLoginSession` + `requireAdmin`

2. **src/routes/admin/categories.ts**
   - ❌ Before: `authenticate` + `requireAdmin`
   - ✅ After: `validateLoginSession` + `requireAdmin`

3. **src/routes/admin/products.ts**
   - ❌ Before: `authenticate` + `requireAdmin`
   - ✅ After: `validateLoginSession` + `requireAdmin`

4. **src/routes/admin/inventory.ts**
   - ❌ Before: `authenticate` + `requireAdmin`
   - ✅ After: `validateLoginSession` + `requireAdmin`

5. **src/routes/admin/orders.ts**
   - ❌ Before: `authenticate` + `requireAdmin`
   - ✅ After: `validateLoginSession` + `requireAdmin`

6. **src/routes/admin/carts.ts**
   - ❌ Before: `authenticate` + `requireAdmin`
   - ✅ After: `validateLoginSession` + `requireAdmin`

## Auth Flow (Both Customer & Admin)
```typescript
// 1. Login (same for both roles)
POST /api/v1/auth/login
→ Creates sessionId cookie via loginSessionService
→ Returns user with role info (type: 1 for Admin, type: 2 for Customer)

// 2. Protected Routes (now unified)
GET /api/v1/auth/profile          // Uses validateLoginSession ✅
GET /api/v1/admin/categories      // Now uses validateLoginSession ✅
GET /api/v1/admin/customers       // Now uses validateLoginSession ✅
GET /api/v1/admin/products        // Now uses validateLoginSession ✅
GET /api/v1/admin/inventory       // Now uses validateLoginSession ✅
GET /api/v1/admin/orders          // Now uses validateLoginSession ✅

// 3. Role Check (unchanged)
→ requireAdmin checks req.user.role.type === 1
→ Works with both authenticate AND validateLoginSession
```

## Postman Setup (No Changes Needed)
The same login flow works for both customer and admin:

```
1. Login: POST {{baseUrl}}/auth/login
   Body: { "email": "dairy.drop@admin.com", "password": "Dairy*drop123" }
   
2. Cookie: sessionId is automatically saved by Postman
   
3. Admin Endpoints: All requests to /admin/* now work with the sessionId cookie
```

## Testing
After this fix, admin APIs should work exactly like `/auth/profile`:
- ✅ Cookie-based session authentication
- ✅ `validateLoginSession` validates the sessionId
- ✅ `requireAdmin` checks role.type === 1
- ✅ req.user populated with userId, email, sessionId
- ✅ No JWT token required in Authorization header

## Key Insight
Both customer and admin use the **same login endpoint** and **same session-based auth** mechanism. The difference is in role-based middleware (`requireAdmin` vs implicit customer access), not in the authentication method itself.
