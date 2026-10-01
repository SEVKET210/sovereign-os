/* ============================================================
   SOVEREIGN-OS — Client-Side Google Drive Direct Storage Adapter
   Direct REST API v3 multipart upload & media stream retrieval
   utilizing scoped client-side access tokens and obfuscated chunk hashes.
   ============================================================ */

export class GoogleDriveAdapter {
  private static readonly API_BASE = 'https://www.googleapis.com/drive/v3';
  private static readonly UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

  /**
   * Searches for a file in Google Drive by its content-addressed filename.
   */
  public static async findFileIdByName(
    fileName: string,
    accessToken: string,
    folderId?: string
  ): Promise<string | null> {
    let q = `name = '${fileName}' and trashed = false`;
    if (folderId && folderId.trim()) {
      q += ` and '${folderId.trim()}' in parents`;
    }

    const url = `${this.API_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`GDRIVE_SEARCH_FAILED: ${res.status} ${res.statusText} — ${errText}`);
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  }

  /**
   * Uploads an encrypted content-addressed chunk directly to Google Drive via multipart upload.
   */
  public static async uploadChunk(
    chunkHash: string,
    payload: Uint8Array,
    accessToken: string,
    folderId?: string
  ): Promise<string> {
    const fileName = `${chunkHash}.bin`;
    const boundary = `SOVEREIGN_BOUNDARY_${Date.now()}`;

    const metadata: { name: string; mimeType: string; parents?: string[] } = {
      name: fileName,
      mimeType: 'application/octet-stream',
    };

    if (folderId && folderId.trim()) {
      metadata.parents = [folderId.trim()];
    }

    const metadataStr = JSON.stringify(metadata);
    const textEncoder = new TextEncoder();

    const part1 = textEncoder.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataStr}\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`
    );
    const part2 = textEncoder.encode(`\r\n--${boundary}--`);

    const fullBody = new Uint8Array(part1.byteLength + payload.byteLength + part2.byteLength);
    fullBody.set(part1, 0);
    fullBody.set(payload, part1.byteLength);
    fullBody.set(part2, part1.byteLength + payload.byteLength);

    const uploadUrl = `${this.UPLOAD_BASE}/files?uploadType=multipart`;

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: fullBody as unknown as BodyInit,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`GDRIVE_UPLOAD_FAILED: ${res.status} ${res.statusText} — ${errText}`);
    }

    const result = await res.json();
    return result.id;
  }

  /**
   * Downloads a chunk binary stream directly from Google Drive into RAM.
   */
  public static async downloadChunk(
    chunkHash: string,
    accessToken: string,
    folderId?: string
  ): Promise<Uint8Array> {
    const fileName = `${chunkHash}.bin`;
    const fileId = await this.findFileIdByName(fileName, accessToken, folderId);

    if (!fileId) {
      throw new Error(`GDRIVE_CHUNK_NOT_FOUND: Object ${fileName} does not exist in Google Drive folder.`);
    }

    const downloadUrl = `${this.API_BASE}/files/${fileId}?alt=media`;
    const res = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`GDRIVE_DOWNLOAD_FAILED: ${res.status} ${res.statusText} — ${errText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  /**
   * Deletes a chunk from Google Drive.
   */
  public static async deleteChunk(
    chunkHash: string,
    accessToken: string,
    folderId?: string
  ): Promise<void> {
    const fileName = `${chunkHash}.bin`;
    const fileId = await this.findFileIdByName(fileName, accessToken, folderId);
    if (!fileId) return;

    const deleteUrl = `${this.API_BASE}/files/${fileId}`;
    const res = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok && res.status !== 404) {
      const errText = await res.text().catch(() => '');
      throw new Error(`GDRIVE_DELETE_FAILED: ${res.status} ${res.statusText} — ${errText}`);
    }
  }

  /**
   * Performs an ephemeral, non-destructive write/read/delete probe test.
   */
  public static async testConnection(
    accessToken: string,
    folderId?: string
  ): Promise<{ latencyMs: number; message: string }> {
    const startTime = performance.now();
    const probeHash = `sovereign_probe_${Date.now()}`;
    const probePayload = new TextEncoder().encode('SOVEREIGN_OS_GDRIVE_ZERO_KNOWLEDGE_PROBE');

    try {
      // 1. Write probe
      const fileId = await this.uploadChunk(probeHash, probePayload, accessToken, folderId);

      // 2. Read probe
      const readUrl = `${this.API_BASE}/files/${fileId}?alt=media`;
      const readRes = await fetch(readUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!readRes.ok) throw new Error('Failed to read back probe file.');

      // 3. Delete probe
      await fetch(`${this.API_BASE}/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const elapsed = Math.round(performance.now() - startTime);
      return {
        latencyMs: elapsed,
        message: `Google Drive API authenticated. Roundtrip drill completed in ${elapsed}ms.`,
      };
    } catch (err) {
      const elapsed = Math.round(performance.now() - startTime);
      throw new Error(`Google Drive verification failed after ${elapsed}ms: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
