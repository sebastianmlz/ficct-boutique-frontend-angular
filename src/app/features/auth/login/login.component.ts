import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(input: { email: $email, password: $password }) {
      accessToken
      expiresAt
      user {
        id
        email
        fullName
        role
        isActive
        createdAt
      }
    }
  }
`;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly apollo = inject(Apollo);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(
        this.apollo.mutate<{
          login: { accessToken: string; expiresAt: string; user: { id: string; email: string; fullName: string; role: 'admin' | 'staff' | 'customer' | 'system' } };
        }>({
          mutation: LOGIN_MUTATION,
          variables: this.form.value,
        }),
      );
      const payload = result.data?.login;
      if (!payload) {
        const message = result.errors?.[0]?.message ?? 'No se pudo iniciar sesión';
        this.error.set(message);
        return;
      }
      this.auth.setSession({
        token: payload.accessToken,
        expiresAt: payload.expiresAt,
        user: {
          id: payload.user.id,
          email: payload.user.email,
          fullName: payload.user.fullName,
          role: payload.user.role,
        },
      });
      this.router.navigate(['/dashboard']);
    } catch (err) {
      const message = (err as { message?: string }).message ?? 'Error inesperado';
      this.error.set(message);
    } finally {
      this.loading.set(false);
    }
  }
}
