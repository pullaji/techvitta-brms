# BRMS Setup Guide - Configuring Credentials

This guide will help you set up proper credentials for the BRMS (Business Receipt Management System) application.

## 1. Environment Variables Setup

### Step 1: Create Environment File
1. Copy the `.env.example` file to `.env` in your project root:
   ```bash
   cp .env.example .env
   ```

### Step 2: Configure Supabase Credentials
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy the following values:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Anon/Public Key** → `VITE_SUPABASE_ANON_KEY`

5. Update your `.env` file:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## 2. Database Setup

### Step 1: Run Database Schema
1. Execute the SQL schema in your Supabase SQL Editor:
   ```bash
   # Copy the contents of database/supabase-schema.sql
   # Paste and run in Supabase SQL Editor
   ```

### Step 2: Create Admin User in Supabase Auth
1. Go to your Supabase Dashboard → Authentication → Users
2. Click "Add user" button
3. Enter your admin email and password
4. Click "Create user"

### Step 3: Sync Auth User with Admin Table
The database schema includes automatic sync functions, but if you have an existing auth user, run the manual sync script:

1. Copy the contents of `sync_admin_user.sql`
2. Paste and run in Supabase SQL Editor
3. Update the user ID and email in the script with your actual values

### Step 4: Verify Setup
1. Check that your user appears in both:
   - Authentication → Users (Supabase Auth)
   - Your custom `admin` table
2. Test login with your credentials

## 3. Security Recommendations

### Password Security
- Use strong, unique passwords
- Implement proper password hashing (bcrypt recommended)
- Consider implementing password complexity requirements
- Add password reset functionality

### Environment Security
- Never commit `.env` files to version control
- Use different credentials for development and production
- Regularly rotate your Supabase keys
- Enable Row Level Security (RLS) policies

### Authentication Improvements
- Implement proper session management
- Add JWT token validation
- Consider implementing two-factor authentication
- Add rate limiting for login attempts

## 4. Testing Your Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the login page
3. Use your configured admin credentials to log in
4. Verify that you can access the dashboard

## 5. Troubleshooting

### Common Issues

**"Missing environment variables" error:**
- Ensure your `.env` file exists and contains the correct variables
- Restart your development server after adding environment variables

**"Invalid credentials" error:**
- Verify your admin user exists in the database
- Check that the password hash matches your input
- Ensure the email address is correct

**Supabase connection issues:**
- Verify your Supabase URL and key are correct
- Check that your Supabase project is active
- Ensure your database schema has been applied

### Getting Help
- Check the Supabase documentation: https://supabase.com/docs
- Review the application logs in your browser's developer console
- Verify your database tables and data in the Supabase dashboard

## 6. Next Steps

After setting up credentials:
1. Test all application features
2. Set up proper password hashing
3. Configure production environment variables
4. Implement additional security measures
5. Set up monitoring and logging

Remember: This is a development setup. For production deployment, implement additional security measures and use proper password hashing.
