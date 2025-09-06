import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicPaths = [
    '/',
    '/join',
    '/help',
    '/privacy',
    '/terms',
    '/error',
    '/maintenance',
  ]

  // Setup routes (allowed during onboarding)
  const setupPaths = ['/setup']
  
  // API routes (handle auth separately)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Allow public routes
  if (publicPaths.some(path => pathname === path)) {
    return NextResponse.next()
  }

  // Create supabase client for middleware
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Get user session
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  // Handle authentication error or no user
  if (error || !user) {
    // If accessing protected route, redirect to login
    if (!publicPaths.some(path => pathname.startsWith(path)) &&
        !setupPaths.some(path => pathname.startsWith(path))) {
      const redirectUrl = new URL('/', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }
    return supabaseResponse
  }

  // Get user profile and memberships for role-based routing
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const { data: memberships } = await supabase
    .from('memberships')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')

  // Check if user has completed setup
  const hasProfile = profile && profile.nickname && profile.avatar
  const hasActiveMembership = memberships && memberships.length > 0

  // Allow setup routes if setup is incomplete
  if (setupPaths.some(path => pathname.startsWith(path))) {
    if (hasProfile && hasActiveMembership) {
      // Setup already complete, redirect to role home
      const primaryRole = memberships[0].role
      const roleHome = getRoleHomePath(primaryRole)
      return NextResponse.redirect(new URL(roleHome, request.url))
    }
    return supabaseResponse
  }

  // If setup incomplete, redirect to setup
  if (!hasProfile || !hasActiveMembership) {
    const setupRoute = getSetupRoute(user.email ? 'parent' : 'student')
    return NextResponse.redirect(new URL(setupRoute, request.url))
  }

  // Role-based access control
  const userRole = memberships[0].role // Primary role
  const rolePrefix = getRolePrefix(userRole)

  // Check if user is accessing correct role path
  if (pathname.startsWith('/student/') && userRole !== 'student' && userRole !== 'admin') {
    return NextResponse.redirect(new URL(getRoleHomePath(userRole), request.url))
  }

  if (pathname.startsWith('/parent/') && userRole !== 'parent' && userRole !== 'admin') {
    return NextResponse.redirect(new URL(getRoleHomePath(userRole), request.url))
  }

  if (pathname.startsWith('/coach/') && userRole !== 'coach' && userRole !== 'admin') {
    return NextResponse.redirect(new URL(getRoleHomePath(userRole), request.url))
  }

  if (pathname.startsWith('/admin/') && userRole !== 'admin') {
    return NextResponse.redirect(new URL(getRoleHomePath(userRole), request.url))
  }

  // If accessing root after auth, redirect to role home
  if (pathname === '/') {
    return NextResponse.redirect(new URL(getRoleHomePath(userRole), request.url))
  }

  return supabaseResponse
}

function getRoleHomePath(role: string): string {
  switch (role) {
    case 'student':
      return '/student'
    case 'parent':
      return '/parent'
    case 'coach':
      return '/coach'
    case 'admin':
      return '/admin'
    default:
      return '/'
  }
}

function getRolePrefix(role: string): string {
  return `/${role}/`
}

function getSetupRoute(role: string): string {
  switch (role) {
    case 'student':
      return '/setup/avatar'
    case 'parent':
      return '/setup/parent-avatar'
    case 'coach':
      return '/coach' // No setup required
    default:
      return '/setup/avatar'
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder files)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}