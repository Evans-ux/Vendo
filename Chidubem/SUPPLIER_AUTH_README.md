# Vendo Supplier Authentication System

A complete supplier authentication system built with Next.js 15 App Router, TypeScript, Tailwind CSS, and Supabase.

## Features

✅ **Authentication Pages**
- `/supplier/signup` - Supplier registration with validation
- `/supplier/login` - Supplier login
- `/supplier/dashboard` - Protected dashboard

✅ **Form Fields**
- Full Name
- Business Name
- Email
- Phone
- Password (with confirmation)

✅ **Security & Validation**
- Supabase Auth integration
- Server-side authentication
- Protected routes with automatic redirects
- Form validation with error messages
- Password strength requirements

✅ **User Experience**
- Loading spinners during async operations
- Toast notifications for success/error states
- Modern dark UI with orange brand color (#F97316)
- Mobile responsive design
- Smooth animations and transitions

✅ **Technical Features**
- Server Actions for authentication
- Reusable UI components (Input, Button, Card)
- TypeScript for type safety
- Row Level Security (RLS) policies
- Automatic timestamp tracking

## Setup Instructions

### 1. Database Setup

Run the SQL migration in your Supabase SQL Editor:

\`\`\`bash
# The migration file is located at: supabase-migration.sql
\`\`\`

This will create:
- `suppliers` table with all required fields
- Row Level Security policies
- Automatic `updated_at` trigger
- Email index for performance

### 2. Environment Variables

Your `.env.local` file is already configured with:
\`\`\`
NEXT_PUBLIC_SUPABASE_URL=https://hilfcbxcjofxsvaikpar.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_6YtA6V-Z3mIg4XMsRLhkRg_lkT_G4np
\`\`\`

### 3. Install Dependencies

Dependencies are already installed:
- `@supabase/supabase-js` - Supabase client
- `react-hot-toast` - Toast notifications

### 4. Run the Development Server

\`\`\`bash
bun dev
\`\`\`

## Project Structure

\`\`\`
app/
├── actions/
│   └── auth.ts                    # Server actions for auth
├── supplier/
│   ├── layout.tsx                 # Supplier routes layout
│   ├── signup/
│   │   └── page.tsx              # Signup page
│   ├── login/
│   │   └── page.tsx              # Login page
│   └── dashboard/
│       ├── page.tsx              # Dashboard (server component)
│       └── DashboardClient.tsx   # Dashboard UI (client component)
│
components/
├── ui/
│   ├── Input.tsx                 # Reusable input component
│   ├── Button.tsx                # Reusable button component
│   └── Card.tsx                  # Reusable card component
└── providers/
    └── ToastProvider.tsx         # Toast notification provider
│
lib/
└── supabase/
    ├── client.ts                 # Client-side Supabase client
    └── server.ts                 # Server-side Supabase client
\`\`\`

## Routes

| Route | Description | Protection |
|-------|-------------|------------|
| `/supplier/signup` | Supplier registration | Public |
| `/supplier/login` | Supplier login | Public |
| `/supplier/dashboard` | Supplier dashboard | Protected (redirects to login) |

## Authentication Flow

### Signup
1. User fills out the signup form
2. Form validation runs client-side
3. Server action creates auth user in Supabase
4. Supplier data is inserted into `suppliers` table
5. User is redirected to dashboard
6. Success toast is shown

### Login
1. User enters email and password
2. Form validation runs client-side
3. Server action authenticates with Supabase
4. User is redirected to dashboard
5. Success toast is shown

### Dashboard Protection
1. Server component checks for authenticated user
2. If not authenticated, redirects to login
3. Fetches supplier data from database
4. Renders dashboard with supplier information

### Logout
1. User clicks logout button
2. Server action signs out from Supabase
3. User is redirected to login page
4. Success toast is shown

## Design System

### Colors
- **Primary Orange**: `#F97316` (orange-500)
- **Background**: `#111827` (gray-900)
- **Card Background**: `#1F2937` (gray-800)
- **Border**: `#374151` (gray-700)
- **Text Primary**: `#FFFFFF` (white)
- **Text Secondary**: `#9CA3AF` (gray-400)

### Components
All components follow a consistent design pattern:
- Rounded corners (rounded-lg, rounded-2xl)
- Smooth transitions
- Focus states with orange ring
- Disabled states with reduced opacity
- Loading states with spinners

## Security Features

### Row Level Security (RLS)
- Users can only read their own supplier data
- Users can only insert their own supplier data
- Users can only update their own supplier data

### Authentication
- Passwords are hashed by Supabase Auth
- Session management handled by Supabase
- Server-side authentication checks
- Automatic session refresh

### Validation
- Client-side form validation
- Email format validation
- Password length requirements (min 6 characters)
- Password confirmation matching
- Required field validation

## Next Steps

To extend this system, you can:

1. **Add Password Reset**
   - Create forgot password page
   - Implement email-based password reset

2. **Add Email Verification**
   - Enable email confirmation in Supabase
   - Create email verification page

3. **Add Profile Editing**
   - Create profile edit page
   - Allow suppliers to update their information

4. **Add Products Management**
   - Create products table
   - Add CRUD operations for products

5. **Add Orders Management**
   - Create orders table
   - Display order history and details

## Troubleshooting

### "User already registered" error
- Check if the email is already in use
- Check Supabase Auth dashboard for existing users

### Redirect not working
- Ensure cookies are enabled in browser
- Check Supabase URL and key are correct
- Verify RLS policies are set up correctly

### Toast notifications not showing
- Ensure ToastProvider is in the layout
- Check browser console for errors

## Support

For issues or questions:
1. Check Supabase logs in the dashboard
2. Check browser console for errors
3. Verify environment variables are set correctly
4. Ensure database migration was run successfully
