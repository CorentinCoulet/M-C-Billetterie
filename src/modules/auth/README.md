# Authentication Module (Better-Auth)

This module provides a comprehensive authentication system for the M&C Society ticketing platform. It implements secure authentication using JWT tokens and session management.

## Features

- User registration
- User login
- User logout
- Session management
- Password change
- Password reset
- Token validation
- Route protection

## Architecture

The authentication module follows a modular architecture:

- **Types**: Defines the data structures used throughout the module
- **Service**: Implements the business logic for authentication operations
- **Controller**: Handles HTTP requests and responses
- **Routes**: Defines the API routes for authentication operations
- **Middleware**: Protects routes that require authentication

## API Endpoints

- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Login a user
- `POST /api/auth/logout`: Logout a user
- `GET /api/auth/me`: Get the current authenticated user
- `POST /api/auth/change-password`: Change a user's password
- `POST /api/auth/request-reset`: Request a password reset
- `POST /api/auth/reset-password`: Reset a user's password

## Security Features

- Passwords are hashed using bcrypt
- JWT tokens are used for authentication
- Sessions are stored in the database
- Cookies are HttpOnly and SameSite=Strict
- Token expiration is enforced
- Session invalidation on logout and password change
- Protection against email enumeration in password reset

## Usage

### Protecting API Routes

To protect an API route, use the `isAuthenticated` middleware:

```typescript
import { isAuthenticated } from "@/middleware/auth";

export default async function handler(req, res) {
  return isAuthenticated(req, res, () => {
    // Your protected route logic here
  });
}
```

### Accessing the Current User

In protected routes, the authenticated user is attached to the request object:

```typescript
const user = (req as any).user;
```

### Role-Based Access Control

For role-based access control, use the `hasRoles` middleware:

```typescript
import { hasRoles } from "@/middleware/auth";

export default async function handler(req, res) {
  return hasRoles(["admin"])(req, res, () => {
    // Your admin-only route logic here
  });
}
```

## Implementation Details

The authentication module uses:

- JWT for token generation and validation
- Prisma for database operations
- bcrypt for password hashing
- HTTP cookies for token storage
- Next.js middleware for route protection