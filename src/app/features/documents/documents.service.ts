import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuditEntry, DocumentRecord } from '../../shared/models';

export interface UploadRequestInput {
  title: string;
  description?: string;
  category: DocumentRecord['category'];
  mimeType: string;
  sizeBytes: number;
}

export interface UploadRequestResponse {
  document: DocumentRecord;
  upload: { url: string; method: 'PUT'; headers: Record<string, string>; expiresIn: number; key: string };
}

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.documentsApiUrl;

  list(): Promise<DocumentRecord[]> {
    return firstValueFrom(this.http.get<{ documents: DocumentRecord[] }>(`${this.base}/documents`)).then((r) => r.documents);
  }

  requestUpload(input: UploadRequestInput): Promise<UploadRequestResponse> {
    return firstValueFrom(this.http.post<UploadRequestResponse>(`${this.base}/documents/upload-request`, input));
  }

  async uploadBytes(presignedUrl: string, headers: Record<string, string>, file: File): Promise<void> {
    const resp = await fetch(presignedUrl, { method: 'PUT', headers, body: file });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Upload failed (${resp.status}): ${text.slice(0, 200)}`);
    }
  }

  async computeSha256(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  confirmUpload(id: string, sha256: string): Promise<{ document: DocumentRecord }> {
    return firstValueFrom(this.http.post<{ document: DocumentRecord }>(`${this.base}/documents/${id}/confirm`, { sha256 }));
  }

  downloadUrl(id: string): Promise<{ url: string; expiresIn: number; document: DocumentRecord }> {
    return firstValueFrom(this.http.get<{ url: string; expiresIn: number; document: DocumentRecord }>(`${this.base}/documents/${id}/download-url`));
  }

  verify(id: string): Promise<{ intact: boolean; chainIntact: boolean; storedSha: string; currentSha: string; brokenAt: number; document: DocumentRecord }> {
    return firstValueFrom(
      this.http.get<{ intact: boolean; chainIntact: boolean; storedSha: string; currentSha: string; brokenAt: number; document: DocumentRecord }>(
        `${this.base}/documents/${id}/verify`,
      ),
    );
  }

  softDelete(id: string): Promise<{ document: DocumentRecord }> {
    return firstValueFrom(this.http.delete<{ document: DocumentRecord }>(`${this.base}/documents/${id}`));
  }

  listAudit(params: { documentId?: string }): Promise<AuditEntry[]> {
    const query = params.documentId ? `?documentId=${params.documentId}` : '';
    return firstValueFrom(this.http.get<{ entries: AuditEntry[] }>(`${this.base}/audit${query}`)).then((r) => r.entries);
  }
}
