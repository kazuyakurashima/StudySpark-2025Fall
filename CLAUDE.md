# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Linting
npm run lint
```

## Project Overview

StudySpark is a Japanese educational web application designed for 6th-grade elementary students preparing for junior high school entrance exams. The app supports students, parents, and coaches with learning management and progress tracking.

## Architecture & Technology Stack

- **Framework**: Next.js 14.2.x (App Router)
- **React**: 18.3.x
- **TypeScript**: 5.5.x
- **UI Library**: shadcn/ui components with Tailwind CSS
- **Styling**: Tailwind CSS with CSS variables for theming
- **Font**: Noto Sans JP (Japanese support)
- **Icons**: Lucide React

## User Roles & Routing Structure

The application supports three main user types, each with dedicated routes:

### Student (`/student/`)
- **Home**: `/student/` - Main dashboard
- **Goal Navigator**: `/student/goal/` - Goal setting and tracking
- **Spark**: `/student/spark/` - Learning activities
- **Reflect**: `/student/reflect/` - Progress reflection and chat

### Parent (`/parent/`)
- **Home**: `/parent/` - Parent dashboard
- **Goal**: `/parent/goal/` - Child's goal overview
- **Spark**: `/parent/spark/` - Learning activity monitoring
- **Reflect**: `/parent/reflect/` - Progress discussions

### Coach (`/coach/`)
- **Home**: `/coach/` - Coach dashboard
- **Goal**: `/coach/goal/` - Student goal management
- **Spark**: `/coach/spark/` - Activity assignment and monitoring
- **Reflect**: `/coach/reflect/` - Student progress review

## Setup Flow

New users go through a multi-step setup process:
- `/setup/avatar/` - Student avatar selection
- `/setup/name/` - Name input
- `/setup/profile/` - Profile completion
- `/setup/parent-avatar/` - Parent avatar selection
- `/setup/complete/` - Setup completion

## Component Architecture

### UI Components (`/components/ui/`)
Built on shadcn/ui system with consistent theming:
- Form components (Button, Input, Label, Textarea, Select, Checkbox)
- Layout components (Card, Dialog, Tabs, Avatar)
- Data display (Badge, Progress, Slider)
- Navigation (custom bottom navigation components)

### Navigation Components
- `BottomNavigation` - Student navigation
- `ParentBottomNavigation` - Parent navigation  
- `CoachBottomNavigation` - Coach navigation

Each navigation component is role-specific with consistent styling using blue color scheme for active states.

### Key Patterns
- **Styling**: Uses `cn()` utility from `/lib/utils.ts` for conditional class merging
- **TypeScript**: Strict mode enabled with comprehensive type checking
- **Client Components**: Most interactive components use `"use client"` directive
- **Japanese Localization**: UI text and content are in Japanese

## Configuration Notes

### Next.js Configuration
- ESLint and TypeScript errors are ignored during builds (`ignoreDuringBuilds: true`)
- Image optimization is disabled (`unoptimized: true`)
- This suggests the project prioritizes rapid development/deployment over strict validation

### Authentication & Demo
- Simple demo authentication system in main page
- Uses localStorage for registration state tracking
- Demo users: IDs starting with `student1`, `parent1`, `coach1`
- Coach codes: `COACH123`, `TEACHER456`, `MENTOR789`

### Import Aliases
- `@/*` maps to project root
- `@/components` for UI components
- `@/lib` for utilities
- `@/hooks` for custom hooks (if used)

## Development Considerations

- The app uses Japanese text throughout - maintain localization consistency
- Bottom navigation is fixed and role-specific - test responsive behavior
- Authentication is demo-only - implement proper auth for production
- Type checking is disabled in builds - run `npx tsc --noEmit` for type validation during development