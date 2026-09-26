# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm start:dev        # Dev server with watch on http://localhost:3000
pnpm build            # nest build (also typechecks)
pnpm lint             # ESLint with --fix
pnpm test             # Unit tests (Jest, co-located *.spec.ts under src/)
pnpm test:e2e         # E2E tests (test/jest-e2e.json)
pnpm seed:products    # Idempotent upsert (by slug) of the initial catalog into DATABASE_URI
pnpm seed:images      # Uploads seed-images/products/<slug>-<n>.jpg to Cloudinary (fixed publicId, overwrite) and sets product.images
npx jest src/module/auth/application/use-cases/refresh-tokens.use-case.spec.ts   # Single test file
npx jest -t "test name"               # Single test by name
```

Requires a `.env` (see `.env.example`): `DATABASE_URI` (MongoDB/Atlas), `JWT_ACCESS_SECRET`, `GOOGLE_CLIENT_ID`, `FRONTEND_URL` (CORS origin, default `http://localhost:4000`).

## Architecture

Clean architecture per domain module in `src/module/<domain>/` (**singular** `module`, not `modules`):

- `domain/` — entities (framework-free classes), repository/service **interfaces** (ports)
- `application/` — use-cases (one business action each) and application services; depend only on domain interfaces injected via tokens
- `infrastructure/` — Mongoose schemas + mappers + repository impls (`persistence/`, `repositories/`), passport strategies (`strategies/`), external adapters (`oauth/`, `services/`)
- `presentation/` — GraphQL resolvers, `@InputType()` DTOs (class-validator), `@ObjectType()` types

Cross-cutting in `src/common/`: `constants/injection-tokens.ts` (Symbols binding domain interfaces to impls — the module's `providers` array does the wiring), guards (`JwtAuthGuard` adapts passport to GraphQL via `GqlExecutionContext`, `RolesGuard`), decorators (`@CurrentUser`, `@Roles`), `GraphqlExceptionFilter` (global `APP_FILTER`: maps Nest exceptions → `GraphQLError` with stable `extensions.code` like `UNAUTHENTICATED`/`CONFLICT`).

Typed config in `src/config/` via `registerAs` namespaces (`app`, `database`, `jwt`, `googleOAuth`), loaded globally in `AppModule`; inject with `@Inject(xxxConfig.KEY)`. Mongoose uses the **default connection** (`MongooseModule.forRootAsync` in `AppModule`, no connection name), so `forFeature`/`@InjectModel` take no connection name.

## Auth system (implemented and e2e-verified)

- **Local**: `register` / `login` mutations; bcrypt (12 rounds) password hashes; generic "Credenciales inválidas" on any failure (no account enumeration).
- **Google**: `loginWithGoogle(input: { code })` — authorization-code flow: the frontend only sends the one-time `code`; the backend exchanges it (`OAuthIdentityProvider.exchangeCode`, needs `GOOGLE_CLIENT_SECRET`) and verifies the resulting ID token with `google-auth-library` (checks `aud` = `GOOGLE_CLIENT_ID`), then finds user by `(provider, providerId)`, links by verified email, or creates. Google tokens are never used as app tokens. New providers: implement `OAuthIdentityProvider` in `infrastructure/oauth/` and add it to the `OAUTH_PROVIDERS` factory array in `auth.module.ts` — nothing else changes.
- **Tokens**: access = short-lived JWT (`Authorization: Bearer`); refresh = opaque 64-byte token stored **only as SHA-256 hash** in `refresh_tokens` (one doc per session), delivered exclusively via an `httpOnly` cookie (`path=/graphql`, `SameSite=Lax`) — it never appears in the GraphQL schema. `refreshTokens` mutation rotates (single-use); reuse of a revoked token revokes **all** the user's sessions. `logout` revokes + clears the cookie.
- Protected resolvers: `@UseGuards(JwtAuthGuard)` + `@CurrentUser()`; RBAC via `@Roles('admin')` + `RolesGuard` (User.roles defaults to `['customer']`).

## Products (catalog, read-only for now)

- Public queries `products(filter, sort, page, pageSize): ProductPage`, `product(slug): Product` (null if missing or DRAFT), `relatedProducts(slug, limit)` (same category, excludes itself, max 12) and `productFacets` (colors, in-stock sizes in natural order, min/max price — computed from ACTIVE products with one `$facet` aggregation). Filters: category, color, size (in stock only, `$elemMatch`), maxPrice, minRating, onSale, featured. Sorts: FEATURED, NEWEST, PRICE_ASC, PRICE_DESC, RATING. `ListProductsUseCase` always forces `status: ACTIVE` and clamps `pageSize` to `MAX_PAGE_SIZE` (48).
- **Money is integer cents** (`price`, `compareAtPrice`); the frontend's `formatPrice` divides by 100.
- Derived fields are computed by the `Product` entity, never stored: `discountPercentage`, `isNew` (published ≤ `NEW_PRODUCT_DAYS`), `inStock`. Stock is **per size** (`sizes: [{ size, stock }]`); the API only exposes `inStock` per size, not quantities.
- Every sort ends in `_id` so pagination is deterministic. Images store Cloudinary `publicId` (+ alt/width/height), never full URLs; uploads (phase 2) will use backend-signed direct uploads.

## Cart

- Guests keep their cart in the browser (frontend Zustand + localStorage) and price it with the **public** `cartQuote(items)`; signed-in users use `myCart`, `addToCart`, `updateCartItem` (quantity 0 removes), `mergeCart(items)` (called on login) and `clearCart` — all behind `JwtAuthGuard`, always scoped to the token's user (no `userId` argument exists).
- The cart stores only `{ productId, size, quantity }`, never prices. Every read goes through `CartPricer` → `priceCart()` (pure, `domain/services/cart-pricing.ts`): prices come from the current product, quantities are capped to stock and `MAX_QUANTITY_PER_LINE` (10), unavailable lines are returned with `unavailableReason` but excluded from totals. Shipping 4.95 € unless subtotal ≥ 50 € (`FREE_SHIPPING_THRESHOLD`).
- `Cart` entity is immutable (every operation returns a new Cart); `merge()` sums repeated lines. `toProductType()` lives in `products/presentation/product.presenter.ts` so cart lines reuse it.

## Favorites

- Favorites require a session (the frontend shows a login modal to guests). Signed-in: `myFavoriteIds`, `toggleFavorite(productId)`, `mergeFavorites(productIds)` (adds without removing; the frontend uses it to save the favorite a guest tapped before logging in) — all return the updated id list (most recent first, max 200). Adding validates the product is ACTIVE; removing never does (users must be able to clean up retired products).
- Public `productsByIds(ids)` (products module, max 100, keeps requested order, ACTIVE only) turns ids into cards for both guests and signed-in users.

## Orders / checkout (Stripe)

- Login-only. `startCheckout(input: ShippingAddressInput)` closes the user's previous pending order, prices the cart with `CartPricer` (rejects empty carts / unavailable lines), **reserves stock** atomically per line (`reserveStock`, rolled back on any failure), creates an `Order` snapshot (prices, names, address; `number` = `AMB-XXXXXXXX`; `expiresAt` = 30 min) and a Stripe PaymentIntent for the backend-computed total → returns `{ order, clientSecret }`. `confirmOrderPayment(orderId)` and `order(id)` are owner-only (others get NOT_FOUND).
- Stripe lives only behind the `PAYMENT_GATEWAY` port (`infrastructure/payments/stripe-payment.gateway.ts`, lazy client → 503 `SERVICE_UNAVAILABLE` if `STRIPE_SECRET_KEY` is missing). All state changes go through `OrderLifecycleService`; transitions are conditional (`markPaidIfPending` / `cancelIfPending`) so the webhook, the client confirmation and the expiry sweep never double-apply. Paid → ordered lines removed from the cart; cancelled → stock released. Paid only if Stripe says `succeeded` AND the amount matches.
- Webhook: REST `POST /webhooks/stripe` (needs `rawBody: true` in `main.ts` and `STRIPE_WEBHOOK_SECRET`); signature verified before anything. Locally run `pnpm stripe:listen` next to `start:dev` (Stripe CLI forwards `payment_intent.succeeded|canceled|payment_failed`); the local `whsec_` comes from `stripe listen --print-secret` and differs from the production endpoint secret. The CLI login expires every 90 days (`stripe login`). `ExpiredOrdersSweeper` closes expired pending orders every 5 min (checks Stripe first: a last-second payment wins).
- `GraphqlExceptionFilter` also handles HTTP (REST) contexts by writing a JSON response.
- Input is `CheckoutInput { email, shippingAddress { fullName, phone, line1, city, country } }` (no postal code by product decision). The email is the order's contact/receipt email (may differ from the account). Payments are **card only** (`payment_method_types: ['card']`, must match the frontend `<Elements paymentMethodTypes>`).
- `locations` module: public `shippingCountries` (America + Europe, list in `domain/shipping-countries.ts`, Spanish names via `Intl.DisplayNames`, dial codes via `libphonenumber-js`) and `searchCities(countryCode, search, limit)` backed by `all-the-cities` (GeoNames, lazy-loaded in memory, accent-insensitive). `StartCheckoutUseCase` rejects countries/cities outside the directory and phones invalid for the country, and stores the canonical city name + E.164 phone.

## Email (Resend)

- `notifications` module exposes only the `EMAIL_SENDER` port (`ResendEmailSender`; without `RESEND_API_KEY` it just logs). Config: `RESEND_API_KEY`, `EMAIL_FROM` (default `onboarding@resend.dev`, which Resend only delivers to the account owner's address until a domain is verified).
- Order confirmation: `OrderLifecycleService.markPaid` fires `OrderMailer.sendOrderConfirmation` (not awaited, never throws) only when it wins the PENDING→PAID transition, with idempotency key `order-confirmation/<orderId>`. Template is a pure function (`orders/application/emails/order-confirmation.email.ts`): table-based inline-styled HTML + plain text, user text escaped with `escapeHtml`, Cloudinary thumbnails forced to `f_jpg`.

## Conventions / gotchas

- **Watch mode on Windows**: `pnpm build` deletes `dist/` and can crash a running `start:dev`; rapid multi-file edits can also make Nest's watcher die (`taskkill` error). Restart `start:dev` if the API stops responding.

- `isolatedModules` + `emitDecoratorMetadata`: pure types used in decorated signatures (constructor params, resolver args) **must** use `import type` or the build fails (TS1272).
- GraphQL context is `{ req, res }` (set in `AppModule`) — needed by the refresh-cookie logic (`presentation/refresh-token-cookie.ts`) and the guards.
- Schema is auto-generated to `src/schema.gql` at startup; never edit it by hand. After schema changes, re-run the frontend's `pnpm codegen` (backend must be running).
- Use-case unit tests instantiate classes directly with plain-object mocks (no TestingModule); shared builders in `src/module/auth/application/use-cases/test-helpers.ts`.
- Code comments are written in Spanish (user preference).
