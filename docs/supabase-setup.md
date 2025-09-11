# Supabase Setup Guide

## Database Schema

Create the following tables in your Supabase database:

### Profiles Table

\`\`\`sql
-- Create profiles table
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  name text,
  avatar text,
  role text check (role in ('student', 'parent', 'coach')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

-- Create policies
create policy "Users can view own profile" 
  on profiles for select 
  using (auth.uid() = id);

create policy "Users can update own profile" 
  on profiles for update 
  using (auth.uid() = id);

create policy "Users can insert own profile" 
  on profiles for insert 
  with check (auth.uid() = id);
\`\`\`

### Learning Records Table (Optional - for future use)

\`\`\`sql
-- Create learning records table
create table learning_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  subject text not null,
  understanding_level integer check (understanding_level between 1 and 5) not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS
alter table learning_records enable row level security;

-- Create policies
create policy "Users can view own records" 
  on learning_records for select 
  using (auth.uid() = user_id);

create policy "Users can insert own records" 
  on learning_records for insert 
  with check (auth.uid() = user_id);

create policy "Users can update own records" 
  on learning_records for update 
  using (auth.uid() = user_id);
\`\`\`

## Environment Variables

Create a `.env.local` file with your Supabase credentials:

\`\`\`bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

## Authentication Flow

1. **Sign Up**: Users register with email, password, and role
2. **Profile Creation**: Profile record is automatically created
3. **Sign In**: Users authenticate with email/password
4. **Role-based Routing**: Users are redirected based on their role
5. **Protected Routes**: Pages check authentication and role permissions

## Coach Code Validation

Currently uses hardcoded values for demo purposes:
- `COACH123`
- `TEACHER456` 
- `MENTOR789`

In production, implement proper coach code validation through Supabase functions or API routes.

## Next Steps

1. Set up your Supabase project
2. Run the SQL commands to create tables
3. Add your environment variables
4. Test authentication flow
5. Implement additional features as needed
