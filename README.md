# Eros - AI Couples Therapy Platform

Eros is a web application that provides AI-powered couples therapy. Partners can privately submit their perspectives on conflicts, and Claude AI generates therapeutic advice to help resolve issues.

## Features

- **Private Conflict Resolution**: Each partner submits their perspective privately—the other partner never sees it
- **AI Therapeutic Advice**: Claude Opus 4.5 analyzes both perspectives and provides balanced, empathetic guidance
- **Sequential Workflow**: Structured process ensures both partners contribute before receiving advice
- **Secure & Private**: Row Level Security (RLS) enforces data privacy at the database level

## Tech Stack

- **Frontend**: Next.js 14+ with TypeScript and Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **AI**: Claude API (Anthropic)
- **Authentication**: Supabase Auth

## Setup Instructions

### 1. Install Dependencies

Dependencies are already installed. The project includes:
- Next.js 14+ with TypeScript
- Supabase SSR client
- Anthropic SDK
- React Hook Form & Zod for validation
- React Markdown for advice display

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once your project is ready, go to **Project Settings** → **API**
3. Copy the following values:
   - **Project URL** (e.g., `https://xxx.supabase.co`)
   - **anon public** key
   - **service_role** key (⚠️ Keep this secret!)

4. Go to the **SQL Editor** in your Supabase dashboard
5. Run the migration files in order:
   - `supabase/migrations/20260604000001_initial_schema.sql`
   - `supabase/migrations/20260604000002_rls_policies.sql`
   - `supabase/migrations/20260604000003_functions.sql`

### 3. Set Up Anthropic API

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account or log in
3. Go to **Settings** → **API Keys**
4. Create a new API key and copy it

### 4. Configure Environment Variables

Update `.env.local` with your actual credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Anthropic API
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Current Implementation Status

### ✅ Completed
- Project setup with Next.js, TypeScript, and Tailwind
- Supabase database schema with 6 tables
- Row Level Security (RLS) policies for privacy
- Database functions and triggers
- Supabase client configurations (browser and server)
- Authentication middleware
- Signup page with profile creation
- Login page
- Partner linking system (create/join relationship)
- API routes for relationship management

### 🚧 To Do
- Conflict management API routes
- Dashboard page
- Conflict creation and submission pages
- Claude API integration
- Advice generation endpoint
- Notification system
- Profile page

## Database Schema

The database consists of 6 main tables:

1. **profiles** - User profiles extending Supabase auth.users
2. **relationships** - Couples' relationships with unique link codes
3. **conflicts** - Conflict instances created by couples
4. **perspectives** - Private submissions from each partner (privacy-enforced via RLS)
5. **advice** - AI-generated therapeutic advice from Claude
6. **notifications** - System notifications for partners

## Privacy & Security

- **Row Level Security**: Enforced at the database level—partners can ONLY read their own perspectives
- **Service Role Access**: Used only in trusted server code for Claude to analyze both perspectives
- **Auth Middleware**: Protects all routes requiring authentication
- **Input Validation**: All forms validate inputs before submission

## Testing the App

To test the full workflow, you'll need two separate browser profiles or devices:

1. **Partner A**: Sign up → Create relationship → Get link code → Share with Partner B
2. **Partner B**: Sign up → Join relationship using link code
3. **Partner A**: Create a conflict → Submit perspective
4. **Partner B**: Receive notification → Submit perspective
5. **Both Partners**: View Claude's therapeutic advice

## Project Structure

```
eros/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Auth pages (signup, login, link-partner)
│   │   ├── api/                 # API routes
│   │   │   └── relationships/   # Relationship management APIs
│   │   └── middleware.ts        # Auth middleware
│   ├── lib/
│   │   └── supabase/            # Supabase client configurations
│   └── components/              # React components (to be built)
├── supabase/
│   └── migrations/              # Database migrations
├── .env.local                   # Environment variables (configure this!)
└── README.md                    # This file
```

## Next Steps

1. Set up your Supabase project and run the migrations
2. Get your Anthropic API key
3. Update `.env.local` with your credentials
4. Test the signup, login, and partner linking flows

## Cost Estimate

- **Supabase**: Free tier supports up to 500MB database
- **Anthropic Claude API**: ~$0.045 per conflict resolution
  - 100 conflicts/month: ~$4.50
  - 500 conflicts/month: ~$22.50
- **Vercel**: Free tier for hosting

## Support

For issues or questions, please refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [Anthropic API Documentation](https://docs.anthropic.com)
- [Next.js Documentation](https://nextjs.org/docs)

---

Built with Claude Code ❤️
