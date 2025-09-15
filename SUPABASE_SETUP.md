# Supabase Setup Instructions for BRMS

## Prerequisites
- Node.js (v18 or higher)
- Supabase account
- npm or yarn

## Step 1: Supabase Project Setup

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project or use your existing project
3. Note down your project URL and anon key from Settings > API

## Step 2: Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `database/supabase-schema.sql`
4. Run the SQL script to create all tables and policies

## Step 3: Environment Configuration

The `.env` file has been created with your Supabase credentials:
```
VITE_SUPABASE_URL=https://xxvugyypiiukupsnyzqy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 4: Storage Setup

1. In your Supabase dashboard, go to Storage
2. Create a new bucket named `uploads`
3. Make it public for file uploads
4. The RLS policies are already set up in the schema

## Step 5: Authentication Setup

1. Go to Authentication > Settings in your Supabase dashboard
2. Configure your site URL (e.g., `http://localhost:5173` for development)
3. Add redirect URLs as needed

## Step 6: Install Dependencies

```bash
npm install
```

## Step 7: Start Development Server

```bash
npm run dev
```

## Step 8: Default Login

After running the schema, you can login with:
- Email: admin@brms.com
- Password: You'll need to set this up in Supabase Auth

### Setting up Admin User Password

1. Go to Authentication > Users in Supabase dashboard
2. Find the user with email `admin@brms.com`
3. Click on the user and set a password
4. Or create a new user through the signup process

## Features Implemented

✅ **Real Database**: All dummy data replaced with Supabase
✅ **Authentication**: JWT-based auth with Supabase Auth
✅ **File Uploads**: Real file storage with Supabase Storage
✅ **Real-time Data**: Live data from Supabase database
✅ **Row Level Security**: Users can only see their own data
✅ **Audit Logging**: All actions are logged
✅ **Dashboard**: Real statistics and charts
✅ **Transactions**: CRUD operations with real data

## Database Tables

- **users**: User profiles and authentication
- **transactions**: Financial transactions
- **uploads**: File upload records
- **audit_logs**: System activity logs

## API Endpoints (Supabase)

All data operations now go through Supabase:
- Authentication via Supabase Auth
- Data queries via Supabase client
- File uploads via Supabase Storage
- Real-time subscriptions available

## Security Features

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Secure file uploads with user isolation
- Audit logging for all actions

## Next Steps

1. Run the SQL schema in your Supabase project
2. Set up the admin user password
3. Start the development server
4. Test the application with real data

## Troubleshooting

### Common Issues:

1. **Authentication Error**: Check your Supabase URL and anon key
2. **Database Error**: Ensure the schema has been run successfully
3. **File Upload Error**: Check that the `uploads` bucket exists and is public
4. **RLS Error**: Verify that RLS policies are properly set up

### Getting Help:

- Check Supabase logs in the dashboard
- Verify environment variables are correct
- Ensure all dependencies are installed
- Check browser console for errors
