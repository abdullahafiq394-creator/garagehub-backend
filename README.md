# GarageHub System

## Overview

GarageHub is a comprehensive automotive workshop ecosystem platform that connects six distinct user types in Malaysia's automotive service industry: workshops, suppliers, runners (delivery personnel), towing services, customers, and platform administrators. The system functions as a Shopee-style marketplace that integrates service booking, parts procurement, delivery management, and workshop operations into a unified digital platform.

The platform enables workshops to manage their daily operations (bookings, jobs, staff, inventory, finances), suppliers to sell parts through a multi-state marketplace, runners to handle deliveries with live GPS tracking, and customers to book services and track their vehicle repairs in real-time.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**: React 18 with TypeScript, Vite build tool, Wouter for routing, TanStack Query for server state management, shadcn/ui and Radix UI for component library, Tailwind CSS for styling.

**Design Pattern**: The UI implements a Shopee-inspired e-commerce aesthetic with a multi-theme system (default vibrant orange theme with alternatives for blue, dark, grey, and purple). The design emphasizes visual-first product discovery, mobile-first responsive layouts, and role-specific dashboard views.

**State Management Strategy**: Server state is managed through TanStack Query with simplified queryKeys where backend derives context from authenticated sessions. Local UI state uses React hooks. Authentication state is derived from a dedicated API endpoint rather than client-side storage.

**Component Architecture**: 
- Centralized `RoleDashboardLayout` component manages distinct sidebar renderings for each user role, preventing duplication
- 99+ reusable components following atomic design principles
- Mobile-first responsive design with dedicated mobile bottom navigation
- Theme provider wraps the application enabling runtime theme switching with localStorage persistence

**Key Frontend Patterns**:
- Enhanced Query Fetcher with cache segmentation for date-filtered queries using `cacheKeyPrefix` without polluting REST URLs
- Safe userId extraction from Socket.io sessions supporting multiple auth strategies (Replit OIDC, local email/password, legacy sessions)
- Defensive programming for real-time features with polling fallbacks when WebSocket connections fail

### Backend Architecture

**Technology Stack**: Express.js with TypeScript, PostgreSQL database (Neon serverless), Drizzle ORM, Socket.io for real-time communication, Replit Auth (OIDC) and local authentication, Passport.js for session management.

**API Design**: RESTful API with 150+ endpoints organized by domain (workshops, suppliers, orders, jobs, marketplace, staff, financials). Role-based access control implemented via middleware (`requireRole`, `requireWorkshopOwnership`, `requireSupplierOwnership`).

**Authentication Architecture**:
- Dual authentication system: Replit Auth (OIDC) for Replit platform users + local email/password for production deployments
- Session management via `connect-pg-simple` with PostgreSQL storage (7-day TTL)
- JWT token system with RS256 asymmetric encryption for enterprise features (15-minute access tokens, 7-day refresh tokens)
- Optional Two-Factor Authentication (TOTP) for admin and workshop users
- Bcrypt password hashing with 12 salt rounds

**Security Measures**:
- Helmet middleware for HTTP security headers (CSP, HSTS, X-Frame-Options)
- Rate limiting: 5 requests/15min for auth endpoints, 100 requests/15min for API endpoints
- IP-based banning after 5 failed login attempts
- CSRF protection via tokens
- Comprehensive audit logging to Winston daily rotation logs
- Request ID tracking for debugging and security analysis

**Real-time Communication**: Socket.io implementation with session middleware integration. Supports per-order chat rooms, live GPS tracking updates for runners, real-time wallet balance updates, and notification delivery. Uses defensive userId extraction supporting multiple session formats.

**Background Jobs**: Cron jobs for daily financial report generation (11:59 PM Malaysia time) and automated data cleanup. Live Sandbox mode supports automatic wallet resets for testing.

### Database Architecture

**ORM Choice**: Drizzle ORM chosen for type-safe SQL queries, excellent TypeScript integration, and zero-runtime overhead. Schema defined in `shared/schema.ts` with 40+ tables.

**Key Schema Decisions**:
- PostgreSQL enums for user roles, supplier types, part categories, and Malaysian states
- `financialTransactions` table as single source of truth for all financial reporting (replaces fragmented transaction tracking)
- Separate `sessions` table for Replit Auth session storage
- `workshopCustomers`, `workshopStaff`, `workshopJobs` tables for comprehensive workshop management
- `supplierOrders` and `supplierOrderItems` for marketplace order tracking
- `deliveryAssignments` linking runners to orders with status tracking
- `chatMessages` for per-order communication
- `activityLog` for audit trail of all system actions

**Transaction Patterns**: Atomic operations for critical flows like runner job acceptance (SQL-level concurrency protection), wallet balance updates (transactional debit/credit), and sequential product code generation (database-level locking).

**Performance Optimizations**:
- Database connection pooling with Neon serverless (max 10 connections)
- Query timing measurement and slow query logging (>100ms threshold)
- Indexes on frequently queried columns (user IDs, order statuses, timestamps)
- Request context tracking for debugging query performance

### Key Architectural Patterns

**Atomic Runner Job Acceptance**: Uses single atomic UPDATE query with WHERE conditions to prevent race conditions when multiple runners attempt to accept the same delivery simultaneously.

**Backend-Owned Product Fields**: Auto-population of product codes, verification status, and supplier metadata handled exclusively by backend to prevent client-side manipulation.

**TanStack Query Workshop Pattern**: Simplified queryKeys where backend derives workshop context from authenticated user session, eliminating need for client to manage workshop IDs.

**Cache Segmentation Strategy**: Date-filtered financial queries use `cacheKeyPrefix` parameter to segment TanStack Query cache without adding date parameters to REST endpoint URLs.

**Unified Financial Reporting**: All financial data flows through `financialTransactions` table with standardized columns (type, category, amount, relatedEntityType, relatedEntityId) enabling comprehensive reporting across all revenue/expense sources.

**Face Recognition Attendance**: QR code attendance enhanced with face-api.js biometric verification. Staff registration requires mandatory photo upload with automatic face descriptor calculation and storage. Clock-in/out validates both QR scan and face match (>70% similarity threshold).

**Geofence Attendance Validation**: Workshop settings define allowed clock-in radius. Backend validates staff location against workshop coordinates using Haversine formula before allowing attendance actions.

**Live GPS Tracking System**: Runner mobile apps emit location updates every 10 seconds via Socket.io. Backend updates database (with 5-second debouncing) and broadcasts to workshop/supplier dashboard rooms. Maps use Leaflet.js with OpenStreetMap tiles.

## External Dependencies

### Third-Party Services

**Payment Processing**: Stripe integration for wallet top-ups with webhook handling for payment confirmation. Secure payment flow using Stripe Elements with real-time balance updates via Socket.io.

**AI Integration**: Google Gemini AI (via Replit AI Integrations) for automated product data extraction from URLs and image-based product search using perceptual hashing.

**Cloud Storage**: Google Cloud Storage configured for file uploads (currently gracefully disabled with placeholder URLs - can be enabled via `ENABLE_OBJECT_STORAGE=true` environment variable).

**Mapping Service**: Leaflet.js with OpenStreetMap tiles for live GPS tracking and geofence visualization. No API key required.

**Face Recognition**: @vladmandic/face-api library for browser-based facial recognition (trained models loaded from CDN). Uses TinyFaceDetector and FaceLandmark68Net models.

### Database Provider

**Neon Serverless PostgreSQL**: Production database with WebSocket support for serverless connections. Connection pooling configured with 10 max connections, 30-second idle timeout, 10-second connection timeout.

### Authentication Providers

**Replit Auth (OIDC)**: Primary authentication for Replit-hosted deployments using OpenID Connect discovery.

**Local Auth**: Email/password authentication for standalone deployments with bcrypt password hashing.

### NPM Dependencies (Key Packages)

**Backend Core**:
- express: Web framework
- drizzle-orm: Type-safe ORM
- @neondatabase/serverless: PostgreSQL client
- socket.io: Real-time WebSocket communication
- passport: Authentication middleware
- connect-pg-simple: PostgreSQL session store

**Security**:
- helmet: HTTP security headers
- bcryptjs: Password hashing
- express-rate-limit: API rate limiting
- speakeasy: TOTP two-factor authentication
- jsonwebtoken: JWT token generation/verification

**Utilities**:
- zod: Schema validation
- date-fns/luxon: Date manipulation
- winston: Logging framework
- cron: Scheduled job execution
- jspdf: PDF generation for invoices

**Frontend Core**:
- react: UI framework
- @tanstack/react-query: Server state management
- wouter: Routing
- @radix-ui/*: Headless UI components
- tailwindcss: Utility-first CSS

**Frontend Integrations**:
- socket.io-client: WebSocket client
- @stripe/react-stripe-js: Payment UI
- leaflet/react-leaflet: Map rendering
- @vladmandic/face-api: Face recognition
- react-hook-form: Form state management

### Environment Variables Required

**Database**: `DATABASE_URL` (PostgreSQL connection string)

**Authentication**: `SESSION_SECRET`, `REPL_ID`, `ISSUER_URL` (Replit Auth)

**Payment**: `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

**AI Services**: `AI_INTEGRATIONS_GEMINI_API_KEY`, `AI_INTEGRATIONS_GEMINI_BASE_URL`

**Storage (Optional)**: `ENABLE_OBJECT_STORAGE`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`, `GCS_PROJECT_ID`, `GCS_CREDENTIALS`, `GCS_BUCKET_NAME`

**Testing Mode (Optional)**: `LIVE_SANDBOX=true`, `SANDBOX_WALLET_CREDIT`, `SANDBOX_AUTO_RESET`, `SANDBOX_STATES`