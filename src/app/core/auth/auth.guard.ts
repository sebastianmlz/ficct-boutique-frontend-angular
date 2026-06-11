import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Route guard that protects authenticated areas: allows activation only when a
 * valid session exists, otherwise redirects to /login keeping the target url as
 * a `redirect` query param.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  router.navigate(['/login'], { queryParams: { redirect: state.url } });
  return false;
};
