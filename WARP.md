# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- SPA built with Vue 3 + Vue Router + Pinia and Vuetify. Source lives in src/, production build artifacts in dist/.
- Uses Supabase (Auth, DB, Storage) with multi-tenant isolation via organization_id enforced in shared helpers.
- Features: clients, invoices, accounting/audit placeholders, document archive, dashboard, authentication and role-based access, BCV exchange rate and currency conversion, CSV export.

Common commands
- Preview production build (dist):
  - If Node is available: npx --yes serve -s dist
  - Alternatively (Python): cd dist; python -m http.server 5173
- Development, build, lint, tests: Not defined in this repo snapshot (no package.json or tool configs present). Restore package.json/vite config from VCS to enable npm run dev/build/lint/test.

Environment and configuration
- Vite-style env variables (read via import.meta.env):
  - VITE_SUPABASE_URL: Supabase project URL
  - VITE_SUPABASE_ANON_KEY: Supabase anon key
  - VITE_API_BASE_URL (optional): External API base, defaults to http://localhost:3001/api
- Create a .env at repo root to set these for local dev; code logs a clear warning if they are missing (see src/lib/supabaseClient.js).
- Path alias: the code imports via @/... which assumes bundler resolves @ to src/. Ensure your dev/build config defines this alias.

Big-picture architecture
- App entry and UI
  - src/main.js: Boots Vue app, installs Pinia, Router, Vuetify (with a customized theme and global component defaults), and registers VueDatePicker.
  - src/App.vue: Global shell (AppNavigation, NotificationSystem, routed views, PageTransition).
  - Styling in src/styles/ (global.css, animations.css, vuetify-overrides.css). Material Design Icons used.
- Routing and access control
  - src/router/index.js: Route table (Dashboard, Clientes, Facturacion, Contabilidad, Auditoria, Archivo, Usuarios, Login). beforeEach guard checks Supabase session, ensures organization_id is set, and optionally enforces route roles; falls back to localStorage flags if Supabase is unavailable.
- Supabase integration and tenancy
  - src/lib/supabaseClient.js: Creates singleton client from VITE_SUPABASE_* values; exposes helpers for session/user.
  - src/utils/tenantHelpers.js: Centralizes multi-tenant concerns: get/set/clear organization_id in localStorage; query/insert/update/delete helpers that always filter by organization_id; utilities for ownership checks and organization name.
  - src/utils/initTenant.js: Initializes or resets organization_id on app load.
- Domain services (frontend data layer)
  - src/services/userService.js: Auth (Supabase Auth) + user CRUD/role permissions; robust local fallback when Supabase is absent; persists authToken/currentUser; sets current organization.
  - src/services/clientService.js, src/services/invoiceService.js, src/services/documentService.js: CRUD with tenant-aware helpers; statistics via RPC fallback; soft-delete patterns; Supabase Storage for document files and cleanup of orphaned files.
  - src/services/api.js: Axios instance for optional external API using VITE_API_BASE_URL and Bearer auth from localStorage.
  - src/services/exportService.js: CSV generation and download for invoices and tables.
  - src/services/bcvService.js: BCV exchange rate via public proxy with local caching and sane defaults; conversions USD⇄VES; used by UI components.
- UI components/examples
  - src/components/layout/AppNavigation.vue: Top bar, user menu, side navigation, BCV chip with refresh and permission-gated items.
  - src/components/common/BCVRateDisplay.vue and CurrencyConverter.vue: Surface exchange rate and conversions with loading/debug states.
  - Forms and tables live under src/components/forms and src/components/common.

Notes for agents
- This repo lacks the Node project scaffolding (package.json, vite.config). If you need to run a dev server or add dependencies, first restore those files from version control or recreate a Vite Vue 3 + Vuetify setup and wire the @ alias to src.
- Authentication/authorization relies on Supabase; the app gracefully degrades to localStorage-based fallbacks so most flows remain demo-able without backend.
- All tenant-aware data access must go through tenantHelpers helpers to guarantee organization_id scoping.
- The dist/ folder is a deployable static build; serve it via any static HTTP server.
