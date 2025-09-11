# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StudySpark is a Next.js educational application with three user types: students, parents, and coaches. It features a comprehensive learning management system with goal tracking, progress monitoring, and AI coaching capabilities.

## Commands

### Development
\`\`\`bash
npm run dev          # Start development server (Next.js)
npm run build        # Build production bundle
npm run start        # Start production server
npm run lint         # Run ESLint for code quality
\`\`\`

### Testing
No test scripts are currently configured. Add test commands when implementing testing framework.

## Architecture

### Tech Stack
- **Framework**: Next.js 14.2.x with App Router
- **UI Library**: React 18.3.x with TypeScript 5.5.x
- **Styling**: Tailwind CSS v4 with CSS variables
- **Components**: shadcn/ui components (Radix UI primitives)
- **Forms**: react-hook-form with Zod validation

### Project Structure
- `/app` - Next.js App Router pages and layouts
  - `/student` - Student dashboard and features
  - `/parent` - Parent monitoring interface
  - `/coach` - Coach/teacher management tools
  - `/setup` - Onboarding flow for new users
- `/components` - Reusable React components
  - `/ui` - shadcn/ui base components
  - Bottom navigation components for each user type
- `/lib` - Utility functions and shared logic
- `/public` - Static assets including images

### Key Architectural Patterns

1. **Authentication Flow**: Mock authentication based on user ID prefixes (student/parent/coach). Real auth implementation needed for production.

2. **User Types & Routing**:
   - Students: Access learning dashboard, goals, reflections, and spark features
   - Parents: Monitor child progress with similar navigation structure
   - Coaches: Manage multiple students and track overall class performance

3. **Component Architecture**:
   - All pages use "use client" directive for client-side interactivity
   - Consistent use of shadcn/ui components with custom styling
   - Theme provider wraps the application for dark mode support

4. **Data Management**: Currently uses localStorage and mock data. Prepared for API integration with clear data structures for:
   - Learning history and progress tracking
   - Goal setting and achievement monitoring
   - Test scheduling and results
   - AI coach interactions

5. **Navigation**: Role-specific bottom navigation components that persist across pages within each user section.

## Important Notes

- The application is currently in demo mode with mock data and simulated authentication
- Avatar images are hosted on Vercel blob storage
- Japanese language is used throughout the UI
- Mobile-first responsive design with careful attention to small screen layouts
