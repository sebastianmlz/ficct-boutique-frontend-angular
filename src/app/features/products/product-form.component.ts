import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { ImageUploadComponent } from '../../shared/components/image-upload/image-upload.component';
import { AutosizeTextareaDirective } from '../../shared/directives/autosize-textarea.directive';
import { DocumentsService } from '../documents/documents.service';
import { DocumentDisplayService } from '../../shared/services/document-display.service';

const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      sku
      name
      basePrice
      imageDocumentId
    }
  }
`;

const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($input: UpdateProductInput!) {
    updateProduct(input: $input) {
      id
      sku
      name
      basePrice
      imageDocumentId
      isActive
    }
  }
`;

const REPLACE_IMAGE = gql`
  mutation ReplaceImage($id: UUID!, $newImageDocumentId: UUID!) {
    replaceProductImage(id: $id, newImageDocumentId: $newImageDocumentId) {
      id
      imageDocumentId
    }
  }
`;

const PRODUCT_QUERY = gql`
  query GetProduct($id: UUID!) {
    product(id: $id) {
      id
      sku
      name
      description
      category
      basePrice
      currency
      imageDocumentId
      isActive
    }
  }
`;

interface ProductForEdit {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  basePrice: number;
  currency: string;
  imageDocumentId: string | null;
  isActive: boolean;
}

/**
 * Product create/edit form. Detects edit mode from the route id, manages the
 * optional image upload (request URL, upload, SHA-256, confirm) and persists
 * the product via create/update/replace-image GraphQL mutations.
 */
@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ImageUploadComponent, AutosizeTextareaDirective],
  templateUrl: './product-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly apollo = inject(Apollo);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly documents = inject(DocumentsService);
  private readonly docDisplay = inject(DocumentDisplayService);

  readonly editing = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly uploadStage = signal<string>('');
  readonly error = signal<string | null>(null);
  readonly existingImageUrl = signal<string | null>(null);
  readonly existingImageDocId = signal<string | null>(null);

  private pickedFile: File | null = null;

  readonly form: FormGroup = this.fb.group({
    sku: ['', [Validators.required, Validators.minLength(3)]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    category: ['blusas', Validators.required],
    description: [''],
    basePrice: [0, [Validators.required, Validators.min(0)]],
    currency: ['BOB', Validators.required],
    isActive: [true],
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editing.set(true);
      this.editingId.set(id);
      this.form.get('sku')?.disable();
      void this.loadForEdit(id);
    }
  }

  async loadForEdit(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.apollo.query<{ product: ProductForEdit }>({ query: PRODUCT_QUERY, variables: { id }, fetchPolicy: 'network-only' }),
      );
      const p = res.data?.product;
      if (!p) {
        this.error.set('Producto no encontrado');
        return;
      }
      this.form.patchValue({
        sku: p.sku,
        name: p.name,
        category: p.category,
        description: p.description ?? '',
        basePrice: p.basePrice,
        currency: p.currency,
        isActive: p.isActive,
      });
      this.existingImageDocId.set(p.imageDocumentId);
      if (p.imageDocumentId) {
        const url = await this.docDisplay.getDisplayUrl(p.imageDocumentId);
        this.existingImageUrl.set(url);
      }
    } catch (err) {
      this.error.set((err as { message?: string }).message ?? 'Error al cargar');
    } finally {
      this.loading.set(false);
    }
  }

  onImageChosen(file: File): void {
    this.pickedFile = file;
    this.error.set(null);
  }

  onImageCleared(): void {
    this.pickedFile = null;
  }

  async uploadNewImage(skuHint: string): Promise<string | undefined> {
    if (!this.pickedFile) return undefined;
    this.uploading.set(true);
    try {
      this.uploadStage.set('Solicitando URL segura…');
      const req = await this.documents.requestUpload({
        title: `Imagen catálogo · ${skuHint || 'producto'}`,
        description: 'Imagen subida desde panel administrativo',
        category: 'image',
        mimeType: this.pickedFile.type,
        sizeBytes: this.pickedFile.size,
      });
      this.uploadStage.set('Subiendo a almacenamiento privado…');
      await this.documents.uploadBytes(req.upload.url, req.upload.headers, this.pickedFile);
      this.uploadStage.set('Calculando hash SHA-256…');
      const sha = await this.documents.computeSha256(this.pickedFile);
      this.uploadStage.set('Confirmando…');
      await this.documents.confirmUpload(req.document.id, sha);
      return req.document.id;
    } finally {
      this.uploading.set(false);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    try {
      const raw = this.form.getRawValue();
      let imageDocumentId: string | undefined;

      if (this.pickedFile) {
        imageDocumentId = await this.uploadNewImage(raw.sku);
      }

      if (this.editing()) {
        const editId = this.editingId();
        if (!editId) throw new Error('No id en modo edición');
        const updRes = await firstValueFrom(
          this.apollo.mutate({
            mutation: UPDATE_PRODUCT,
            variables: {
              input: {
                id: editId,
                name: raw.name,
                description: raw.description || null,
                category: raw.category,
                basePrice: raw.basePrice,
                isActive: raw.isActive,
              },
            },
          }),
        );
        if (updRes.errors?.length) {
          this.error.set(updRes.errors[0].message);
          return;
        }
        if (imageDocumentId) {
          const repRes = await firstValueFrom(
            this.apollo.mutate({
              mutation: REPLACE_IMAGE,
              variables: { id: editId, newImageDocumentId: imageDocumentId },
            }),
          );
          if (repRes.errors?.length) {
            this.error.set(repRes.errors[0].message);
            return;
          }
          const old = this.existingImageDocId();
          if (old) {
            try {
              await this.documents.softDelete(old);
            } catch (e) {
              console.warn('Could not soft-delete old image doc', e);
            }
            this.docDisplay.invalidate(old);
          }
          this.docDisplay.invalidate(imageDocumentId);
        }
      } else {
        const input: Record<string, unknown> = { ...raw, imageDocumentId };
        if (!input['description']) input['description'] = null;
        delete input['isActive'];
        const res = await firstValueFrom(this.apollo.mutate({ mutation: CREATE_PRODUCT, variables: { input } }));
        if (res.errors?.length) {
          this.error.set(res.errors[0].message);
          return;
        }
      }
      this.router.navigate(['/products']);
    } catch (err) {
      this.error.set((err as { message?: string }).message ?? 'Error al guardar');
    } finally {
      this.saving.set(false);
      this.uploading.set(false);
    }
  }
}
