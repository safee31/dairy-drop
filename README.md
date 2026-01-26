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
