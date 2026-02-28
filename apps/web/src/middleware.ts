import { createServerClient, type CookieOptions } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Fetch user profile to check status_acceso
    let userStatus = null;
    if (user) {
        const { data: profile } = await supabase
            .from('perfiles')
            .select('status_acceso')
            .eq('id', user.id)
            .single();
        userStatus = profile?.status_acceso;
    }

    // List of protected routes
    const protectedRoutes = ['/dashboard', '/solicitudes', '/materia-prima', '/empresas', '/productos', '/usuarios', '/catalogos', '/reportes', '/settings'];
    const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route));

    // If no user and trying to access protected routes, redirect to login
    if (!user && isProtectedRoute) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/login';
        return NextResponse.redirect(redirectUrl);
    }

    // If user is not ACTIVE and trying to access protected routes, redirect to registration success/pending
    if (user && userStatus !== 'ACTIVO' && isProtectedRoute) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/pendiente-aprobacion';
        return NextResponse.redirect(redirectUrl);
    }

    // If user and trying to access login OR root, redirect to dashboard
    if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/')) {
        // If pending, send to success page instead of dashboard
        if (userStatus !== 'ACTIVO') {
            const redirectUrl = request.nextUrl.clone();
            redirectUrl.pathname = '/pendiente-aprobacion';
            return NextResponse.redirect(redirectUrl);
        }
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/dashboard';
        return NextResponse.redirect(redirectUrl);
    }

    // If no user and trying to access root, redirect to login
    if (!user && request.nextUrl.pathname === '/') {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/login';
        return NextResponse.redirect(redirectUrl);
    }

    return response;
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
