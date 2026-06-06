import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // Protected routes - require authentication
  const protectedPaths = ['/dashboard', '/profile', '/conflicts', '/link-partner']
  const isProtected = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtected && !session) {
    const url = new URL('/login', request.url)
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Auth routes - redirect to dashboard if already logged in
  const authPaths = ['/login', '/signup']
  const isAuthPath = authPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isAuthPath && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
