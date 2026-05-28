import { installAuthInterceptor } from '$lib/api/interceptor';

// Install auth interceptor at app startup — before any component onMount fires.
// This ensures all /api/* fetches (including Sidebar's school data fetch) carry
// the Bearer token from the client_token cookie.
installAuthInterceptor();
