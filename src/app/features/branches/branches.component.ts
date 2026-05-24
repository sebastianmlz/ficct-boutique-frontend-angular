import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { Branch } from '../../shared/models';
import { AuthService } from '../../core/auth/auth.service';

const BRANCHES_QUERY = gql`
  query Branches {
    branches { id code name address latitude longitude phone isActive }
  }
`;

const CREATE_BRANCH = gql`
  mutation CreateBranch($input: CreateBranchInput!) {
    createBranch(input: $input) { id code name }
  }
`;

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './branches.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BranchesComponent {
  private readonly apollo = inject(Apollo);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly branches = signal<Branch[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly showForm = signal(false);

  readonly form: FormGroup = this.fb.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    address: ['', Validators.required],
    latitude: [null],
    longitude: [null],
    phone: [''],
  });

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const r = await firstValueFrom(this.apollo.query<{ branches: Branch[] }>({ query: BRANCHES_QUERY }));
      this.branches.set(r.data?.branches ?? []);
    } catch (e) {
      this.error.set((e as { message?: string }).message ?? 'Error');
    } finally {
      this.loading.set(false);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);
    try {
      const input = { ...this.form.value };
      if (!input.phone) input.phone = null;
      const r = await firstValueFrom(this.apollo.mutate({ mutation: CREATE_BRANCH, variables: { input } }));
      if (r.errors?.length) {
        this.error.set(r.errors[0].message);
        return;
      }
      this.showForm.set(false);
      this.form.reset({ code: '', name: '', address: '', latitude: null, longitude: null, phone: '' });
      await this.load();
    } finally {
      this.saving.set(false);
    }
  }
}
