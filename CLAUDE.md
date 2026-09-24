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

## Conventions / gotchas

- `isolatedModules` + `emitDecoratorMetadata`: pure types used in decorated signatures (constructor params, resolver args) **must** use `import type` or the build fails (TS1272).
- GraphQL context is `{ req, res }` (set in `AppModule`) — needed by the refresh-cookie logic (`presentation/refresh-token-cookie.ts`) and the guards.
- Schema is auto-generated to `src/schema.gql` at startup; never edit it by hand. After schema changes, re-run the frontend's `pnpm codegen` (backend must be running).
- Use-case unit tests instantiate classes directly with plain-object mocks (no TestingModule); shared builders in `src/module/auth/application/use-cases/test-helpers.ts`.
- Code comments are written in Spanish (user preference).
