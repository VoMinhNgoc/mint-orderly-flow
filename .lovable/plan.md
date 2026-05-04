# Order Management Web App — API-Backed Build

A clean, mobile-responsive Order Management app in soft mint, Inter font, Shopee-style rounded cards. No auth, no LocalStorage — all data flows through your FastAPI backend at `https://glamour-ferris-spoken.ngrok-free.dev`.

## Pages & Routes

- `/` — Home: 3 large mint buttons → Cart, Processing, Customers (plus a small link to Product Catalog admin).
- `/products` — Product Catalog (admin): list + create products.
- `/products/:id` — Product Detail (Shopee-style): image, full name, long description, base price.
- `/cart` — Shopping Cart (draft orders), 9-column table.
- `/processing` — Processing Orders with Buy modal + side-panel totals.
- `/customers` — Customer List with manual Final Amount + Reset to Suggested.

All routes are public — no login, no protected routes.

## Feature Details

**Home** — Three big rounded mint cards (Cart, Processing, Customers). Small "Manage Products" link.

**Product Catalog (`/products`)**
- Admin form: Product ID (alphanumeric, e.g. `yt09`), Image URL, Name, Long Description, Base Price.
- Grid of product cards; each ID is a clickable link → `/products/:id`.
- `GET /products`, `POST /products`.

**Product Detail (`/products/:id`)** — Image, full name, long description, original price. Reached from any clickable product ID across the app.

**Shopping Cart (`/cart`)** — 9 columns: Product ID (link) · Product Name · Simple Description · Base Sets · Split Sets · Units per Set · Product Price · Markup Fee · Expiry Date. Add row (pick product ID, fill fields), Delete row, **Proceed to Transaction** → `POST /orders` then remove from cart view.

**Processing Orders (`/processing`)** — Same columns minus Expiry Date. Each row has a side-panel summary: `[Customer Name] — [Total Due]` where **Total Due = (Price + Markup) × Base Sets × Split Sets × Units per Set**. Buttons: **Buy** (opens modal: Customer Name, Contact Info, Payment Status → creates customer + marks order bought) and **Delete** (cancel order).

**Customer List (`/customers`)** — Columns: Customer Name · Contact Info · Purchase Date · Purchased Product IDs (clickable) · Description (manual) · Final Payment Amount. Final Amount is a manual input pre-filled with the calculated suggestion; **Reset to Suggested** button restores it.

## API Integration

Base URL: `https://glamour-ferris-spoken.ngrok-free.dev`

| Resource | Endpoints |
|---|---|
| Products | `GET /products`, `POST /products`, `GET /products/:id` |
| Cart | `GET /cart`, `POST /cart`, `DELETE /cart/:id` |
| Orders | `GET /orders`, `POST /orders`, `PATCH /orders/:id`, `DELETE /orders/:id` |
| Customers | `GET /customers`, `POST /customers`, `PATCH /customers/:id` |

- Centralized `apiClient` with base URL + `ngrok-skip-browser-warning` header.
- React Query for fetch/cache/invalidation.
- On any error or slow response (>8s), show a Sonner toast.
- No LocalStorage anywhere.

## Data Models (FastAPI/MySQL friendly, flat JSON)

```json
Product   { "id": "yt09", "name": "...", "description": "...", "image_url": "...", "base_price": 0.0 }
CartItem  { "id": 1, "product_id": "yt09", "product_name": "...", "simple_description": "...",
            "base_sets": 1, "split_sets": 1, "units_per_set": 1,
            "product_price": 0.0, "markup_fee": 0.0, "expiry_date": "YYYY-MM-DD" }
Order     { "id": 1, "product_id": "yt09", "product_name": "...", "simple_description": "...",
            "base_sets": 1, "split_sets": 1, "units_per_set": 1,
            "product_price": 0.0, "markup_fee": 0.0,
            "status": "pending|bought|canceled", "customer_id": null }
Customer  { "id": 1, "name": "...", "contact_info": "...", "purchase_date": "YYYY-MM-DD",
            "product_ids": ["yt09"], "description": "...",
            "payment_status": "paid|unpaid|partial",
            "suggested_amount": 0.0, "final_amount": 0.0 }
```

## Design

- Soft mint palette in `index.css` design tokens (HSL): mint primary, near-white background, slate text.
- Inter font (Google Fonts).
- Rounded-2xl cards, soft shadows, generous spacing — Shopee-inspired.
- Mobile-responsive: tables scroll horizontally on small screens; nav collapses.
- Shared layout with top nav (Home · Products · Cart · Processing · Customers).

## Technical Notes

- React Router routes added in `App.tsx`.
- `src/lib/api.ts` — fetch wrapper with base URL, JSON, error → toast.
- `src/hooks/` — `useProducts`, `useCart`, `useOrders`, `useCustomers` (React Query).
- Forms via `react-hook-form` + `zod`.
- All IDs render as `<Link to={`/products/${id}`}>` for cross-page navigation.
- API base URL stored as a constant (easy to swap later); ngrok header always sent.
