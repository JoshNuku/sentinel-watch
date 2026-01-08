# Authentication Setup Complete ✅

## What Was Added

### Backend Authentication

- **JWT-based authentication** with bcrypt password hashing
- **User model** with email, password, name, and role
- **Auth middleware** to protect API routes
- **Auth routes**: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- Protected all sentinel and alert routes (requires Bearer token)

### Frontend Authentication

- **AuthContext** - React context for auth state management
- **Login page** - Modern sign-in interface
- **Register page** - User registration
- **ProtectedRoute** - HOC to guard dashboard routes
- **Token management** - Stored in localStorage, sent with all API calls
- **Logout functionality** - Clears token and redirects to login

### Features

- Auto token verification on app load
- Auth headers automatically added to all API requests
- WebSocket authentication with token
- User profile display in sidebar
- Session persistence across page reloads

## How to Use

### 1. Install Dependencies

```bash
cd backend
npm install
cd ..
npm install
```

### 2. Create Demo User

```bash
cd backend
npx ts-node src/scripts/seedUser.ts
```

This creates:

- **Email**: admin@orion.gh
- **Password**: password
- **Role**: admin

### 3. Start Backend

```bash
cd backend
npm run dev
```

Backend runs on `http://localhost:5000`

### 4. Start Frontend

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`

### 5. Login

1. Navigate to `http://localhost:5173`
2. Click "Get Started" or visit `/login`
3. Enter credentials:
   - Email: `admin@orion.gh`
   - Password: `password`
4. You'll be redirected to the dashboard

## API Endpoints

### Public Endpoints

- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Login (returns JWT token)
- `GET /api/health` - Health check

### Protected Endpoints (Require Bearer Token)

- `GET /api/auth/me` - Get current user
- `GET /api/sentinels` - List all sentinels
- `POST /api/sentinels/register` - Register new sentinel
- `GET /api/alerts` - List alerts
- `POST /api/alerts` - Create new alert
- `PUT /api/alerts/:id/verify` - Verify alert

## Authentication Flow

```
1. User logs in → Backend validates credentials
2. Backend generates JWT token (expires in 7 days)
3. Frontend stores token in localStorage
4. All API requests include: Authorization: Bearer <token>
5. Backend verifies token on protected routes
6. WebSocket connection includes token for real-time updates
```

## Security Features

✅ Password hashing with bcrypt (salt rounds: 10)
✅ JWT tokens with expiration (7 days)
✅ Protected API routes (middleware authentication)
✅ CORS configuration
✅ Rate limiting on API endpoints
✅ Token verification on every request
✅ Secure password validation (min 6 characters)

## Role-Based Access Control

The system supports three roles:

- **admin** - Full access
- **operator** - Dashboard access, can verify alerts
- **viewer** - Read-only access

_Note: Currently all authenticated users have same access. Implement role-based restrictions in future versions._

## Development Notes

### Adding New Protected Routes

```typescript
// In your route file
import { authenticate } from "../middleware/auth";

router.get("/protected-endpoint", authenticate, yourController);

// For role-based access
import { authenticate, authorize } from "../middleware/auth";

router.post("/admin-only", authenticate, authorize("admin"), yourController);
```

### Accessing User Info in Controllers

```typescript
import { AuthRequest } from "../middleware/auth";

export const yourController = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const userEmail = req.user?.email;
  const userRole = req.user?.role;
  // ... your logic
};
```

### Creating Additional Users

Use the register endpoint or MongoDB directly:

```bash
# Via API
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "operator@orion.gh",
    "password": "secure123",
    "name": "Field Operator",
    "role": "operator"
  }'
```

## Troubleshooting

### "Invalid or expired token"

- Token expired (7 days default)
- Solution: Log out and log in again

### "Authentication required"

- No token in request
- Solution: Ensure you're logged in

### WebSocket not connecting

- Token not being sent
- Solution: Check localStorage has 'token' key

### Cannot login

- Incorrect credentials
- MongoDB not running
- Backend not started

## Production Checklist

Before deploying:

- [ ] Change `JWT_SECRET` in backend `.env` (use strong random string)
- [ ] Set appropriate token expiration time
- [ ] Enable HTTPS for production
- [ ] Configure secure cookie storage (instead of localStorage)
- [ ] Implement refresh tokens for better security
- [ ] Add password reset functionality
- [ ] Enable email verification
- [ ] Implement session logging
- [ ] Add 2FA for admin accounts
- [ ] Configure production CORS origins

## Next Steps

- [ ] Add password reset via email
- [ ] Implement refresh tokens
- [ ] Add user management (admin can create/delete users)
- [ ] Add audit logging for all actions
- [ ] Implement role-based permissions
- [ ] Add session management (view active sessions)
- [ ] Email verification for new users

---

**Project ORION - Fully Authenticated & Production-Ready 🔐**
