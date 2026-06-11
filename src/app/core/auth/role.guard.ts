import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Role } from './auth.service';

/**
 * Guard factory restricting a route to the given roles: returns a CanActivateFn
 * that allows activation only if the current user holds one of `roles`,
 * otherwise redirects to /dashboard.
 */
export function roleGuard(roles: Role[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (auth.hasRole(...roles)) return true;
    router.navigate(['/dashboard']);
    return false;
  };
}
