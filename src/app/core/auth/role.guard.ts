import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Role } from './auth.service';

export function roleGuard(roles: Role[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (auth.hasRole(...roles)) return true;
    router.navigate(['/dashboard']);
    return false;
  };
}
