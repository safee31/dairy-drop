# Dairy Drop — Backend

## Project Hierarchy (Role-Based Modules)

```
Backend
├── Authentication & Access
│   ├── User registration & login
│   ├── JWT & session management
│   ├── Role-based authorization (Admin, Customer, Public)
│   └── OTP & email verification
│
├── Admin Module
│   ├── User management
│   ├── Product catalog management
│   ├── Inventory & stock control
│   ├── Order fulfillment & tracking
│   └── Category & promo management
│
├── Customer Module
│   ├── Browse products & categories
│   ├── Search & filter
│   ├── Shopping cart (add/remove/update)
│   ├── Checkout & order placement
│   ├── Order history & tracking
│   ├── Address book management
│   └── Profile & account settings
│
├── Public Module
│   ├── Product listings (read-only)
│   ├── Category browsing
│   ├── Hero section content
│   └── Search functionality
│
└── Core Services
    ├── Database & ORM
    ├── File storage & image processing
    ├── Email & notifications
    ├── Request validation & error handling
    ├── Rate limiting & security
    └── Logging & monitoring
```

## Functional Breakdown

- **Authentication** — Manages user identity, session tokens, OTP flows, and role assignment
- **User Management** — Admin-controlled user lifecycle and role permissions
- **Product Catalog** — Core product data, images, categories, hero content
- **Inventory** — Stock levels, tracking history, admin adjustments
- **Orders** — Customer checkout, order creation, status workflow, fulfillment tracking
- **Cart** — Session & persistent cart, item management
- **Addresses** — Billing & shipping address storage per user
- **Infrastructure** — Database, file uploads, email, security middleware

## Inventory API

All inventory routes are under `/admin/inventory` and require admin authentication.

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | List all inventory (paginated, searchable, filterable) |
| GET | `/summary` | Total stock, low-stock count, out-of-stock count |
| GET | `/low-stock` | Products at or below reorder level |
| GET | `/:id` | Single inventory item with product + history |
| POST | `/:id/adjust-stock` | Adjust stock quantity and/or reorder level |
| GET | `/:inventoryId/history` | Stock change history (paginated, filterable by type) |

### POST `/:id/adjust-stock`

Single endpoint for all inventory modifications. At least one of `quantityChange` or `reorderLevel` is required.

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `quantityChange` | integer | conditional | Delta to apply (e.g. `+10` or `-5`). Cannot be zero |
| `operationType` | string | if quantityChange | `purchase`, `sale`, `return`, or `adjustment` |
| `reorderLevel` | integer | conditional | New low-stock threshold (>= 0) |
| `referenceId` | string | no | Link to order/PO (max 100 chars) |
| `notes` | string | no | Admin notes |

**Examples:**

```json
// Add 20 units from a purchase
{ "quantityChange": 20, "operationType": "purchase", "notes": "Supplier delivery" }

// Only update reorder level
{ "reorderLevel": 15 }

// Both at once
{ "quantityChange": 10, "operationType": "purchase", "reorderLevel": 25 }
```
