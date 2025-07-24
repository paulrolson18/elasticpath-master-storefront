# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Development & Build:**
- `npm run dev` / `yarn dev` - Start development server (Next.js)
- `npm run build` / `yarn build` - Build for production
- `npm start` / `yarn start` - Start production server

**Code Quality:**
- `npm run lint` / `yarn lint` - Run ESLint
- `npm run lint:fix` / `yarn lint:fix` - Fix ESLint issues
- `npm run format:check` / `yarn format:check` - Check Prettier formatting
- `npm run format:fix` / `yarn format:fix` - Fix Prettier formatting
- `npm run type:check` / `yarn type:check` - TypeScript type checking

**Testing:**
- `npm test` / `yarn test` - Run unit tests with Vitest
- `npm run test:coverage` / `yarn test:coverage` - Run tests with coverage
- `npm run test:watch` / `yarn test:watch` - Run tests in watch mode
- `npm run test:e2e` / `yarn test:e2e` - Run Playwright E2E tests
- `npm run test:ci:e2e` / `yarn test:ci:e2e` - Full E2E test suite with build

## Architecture Overview

### Framework & Structure
- **Next.js 14** with App Router and server components
- **Route groups** organize functionality:
  - `(store)` - Main storefront (products, cart, account)
  - `(checkout)` - Checkout flow and payments
  - `(admin)` - Admin dashboard
  - `(auth)` - Authentication flows

### State Management
- **React Query** (@tanstack/react-query) for server state with 5-minute cache revalidation
- **Context Providers** for application state:
  - `ElasticPathProvider` - API client context
  - `StoreProvider` - Navigation and store-wide state
  - `CartProvider` - Cart state with optimistic updates
  - `AccountProvider` - Authentication and account management

### Key Integrations
- **Elastic Path Commerce Cloud** - Primary ecommerce backend
- **Storyblok** & **Builder.io** - Dual CMS strategy
- **Algolia** & **Klevu** - Search providers (pluggable architecture)
- **Stripe** & **PayPal** - Payment processing
- **NextAuth.js** - Admin authentication
- **OIDC/OAuth2** - Customer authentication

### Custom Hook System (`src/react-shopper-hooks/`)
- Modular hook architecture with provider-based scoping
- **Cart hooks** - Add, update, remove items with optimistic updates
- **Product hooks** - Handle simple, bundle, and variation products
- **Account hooks** - User management and addresses
- **Event system** - Cross-component communication

## Development Guidelines

### File Organization
- **Route-based structure** following App Router conventions
- **Feature-based components** in `/src/components/`
- **Business logic** abstracted to `/src/services/` and `/src/lib/`
- **Custom hooks** centralized in `/src/react-shopper-hooks/`

### Key Files to Understand
- `/src/app/providers.tsx` - Root provider setup and configuration
- `/src/lib/get-store-initial-state.ts` - Server-side rendering data strategy
- `/src/middleware.ts` - Request-level authentication and cart handling
- `/src/lib/epcc-*-client.ts` - Elastic Path API client configurations
- `/src/react-shopper-hooks/*/index.ts` - Hook API surface areas
- `/src/hooks/use-google-places.tsx` - Google Places API integration
- `/src/components/input/GooglePlaces*.tsx` - Address autocomplete components

### Code Conventions
- **TypeScript** with strict mode enabled
- **Tailwind CSS** with custom design system (PRIMARY_COLOR env variable)
- **React Hook Form** + **Zod** for form validation
- **Radix UI** components for accessibility
- **CVA** (Class Variance Authority) for component variants

### Authentication Patterns
- **B2B account switching** with role-based access control
- **HTTP-only cookies** for secure token storage
- **Middleware-based implicit auth** for API access
- **Account member credentials** for customer authentication

### Testing Strategy
- **Vitest** for unit tests
- **Playwright** for E2E tests with page object models in `e2e/models/`
- **@testing-library/react** for component testing

### Environment & Configuration
- Environment-specific client configurations
- **Bundle analyzer** available with `ANALYZE=true`
- **Image optimization** configurable via `NEXT_PUBLIC_DISABLE_IMAGE_OPTIMIZATION`
- **Primary color** customizable via `PRIMARY_COLOR` environment variable
- **Google Places API** for address autocomplete via `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` (uses modern PlaceAutocompleteElement)

## Important Notes

- Always run `yarn lint` and `yarn type:check` before committing
- Use server components by default, client components only when needed
- Follow the existing provider pattern for new state management
- Respect the route group organization when adding new pages
- Leverage React Query for all server state management