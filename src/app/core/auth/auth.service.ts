import { Injectable, computed, signal } from '@angular/core';

export type Role = 'admin' | 'staff' | 'customer' | 'system';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

const TOKEN_KEY = 'ficct.admin.token';
const USER_KEY = 'ficct.admin.user';
const EXP_KEY = 'ficct.admin.exp';

/**
 * Root authentication store. Persists the JWT, expiry and user in localStorage,
 * exposes reactive `user`/`isAuthenticated` signals and role checks, and manages
 * session set/clear used by the login flow, guards and interceptors.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private readonly _user = signal<SessionUser | null>(this.loadUser());
  private readonly _expiresAt = signal<number | null>(this.loadExpiresAt());

  readonly user = computed(() => this._user());
  readonly isAuthenticated = computed(() => {
    const t = this._token();
    const exp = this._expiresAt();
    if (!t || !exp) return false;
    return Date.now() < exp;
  });

  token(): string | null {
    return this._token();
  }

  setSession(input: { token: string; expiresAt: string; user: SessionUser }): void {
    const expMs = new Date(input.expiresAt).getTime();
    localStorage.setItem(TOKEN_KEY, input.token);
    localStorage.setItem(USER_KEY, JSON.stringify(input.user));
    localStorage.setItem(EXP_KEY, String(expMs));
    this._token.set(input.token);
    this._user.set(input.user);
    this._expiresAt.set(expMs);
  }

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXP_KEY);
    this._token.set(null);
    this._user.set(null);
    this._expiresAt.set(null);
  }

  hasRole(...roles: Role[]): boolean {
    const u = this._user();
    return !!u && roles.includes(u.role);
  }

  private loadUser(): SessionUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionUser;
    } catch {
      return null;
    }
  }

  private loadExpiresAt(): number | null {
    const raw = localStorage.getItem(EXP_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
}
