/* ============================================================
   SOVEREIGN-OS — Client-Side WebDAV Direct Storage Adapter
   Direct HTTP PUT, GET, DELETE, and HEAD operations for standard WebDAV endpoints.
   ============================================================ */

export class WebDavAdapter {
  private static getAuthHeader(username?: string, password?: string): Record<string, string> {
    if (username && password) {
      const token = btoa(`${username}:${password}`);
      return { Authorization: `Basic ${token}` };
    }
    return {};
  }

  private static buildFileUrl(endpointUrl: string, chunkHash: string): string {
    const cleanEndpoint = endpointUrl.trim().replace(/\/+$/, '');
    return `${cleanEndpoint}/${chunkHash}.bin`;
  }

  /**
   * Uploads an encrypted chunk directly to a WebDAV endpoint via HTTP PUT.
   */
  public static async uploadChunk(
    chunkHash: string,
    payload: Uint8Array,
    endpointUrl: string,
    username?: string,
    password?: string
  ): Promise<void> {
    const targetUrl = this.buildFileUrl(endpointUrl, chunkHash);
    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
      ...this.getAuthHeader(username, password),
    };

    const res = await fetch(targetUrl, {
      method: 'PUT',
      headers,
      body: payload as unknown as BodyInit,
    });

    if (!res.ok && res.status !== 201 && res.status !== 204) {
      const errText = await res.text().catch(() => '');
      throw new Error(`WEBDAV_UPLOAD_FAILED: ${res.status} ${res.statusText} — ${errText}`);
    }
  }

  /**
   * Downloads an encrypted chunk directly from WebDAV into volatile RAM.
   */
  public static async downloadChunk(
    chunkHash: string,
    endpointUrl: string,
    username?: string,
    password?: string
  ): Promise<Uint8Array> {
    const targetUrl = this.buildFileUrl(endpointUrl, chunkHash);
    const headers = this.getAuthHeader(username, password);

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`WEBDAV_DOWNLOAD_FAILED: ${res.status} ${res.statusText} — ${errText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  /**
   * Deletes a chunk from WebDAV.
   */
  public static async deleteChunk(
    chunkHash: string,
    endpointUrl: string,
    username?: string,
    password?: string
  ): Promise<void> {
    const targetUrl = this.buildFileUrl(endpointUrl, chunkHash);
    const headers = this.getAuthHeader(username, password);

    const res = await fetch(targetUrl, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok && res.status !== 404) {
      const errText = await res.text().catch(() => '');
      throw new Error(`WEBDAV_DELETE_FAILED: ${res.status} ${res.statusText} — ${errText}`);
    }
  }

  /**
   * Executes a non-destructive test drill on the WebDAV endpoint.
   */
  public static async testConnection(
    endpointUrl: string,
    username?: string,
    password?: string
  ): Promise<{ latencyMs: number; message: string }> {
    const startTime = performance.now();
    const probeHash = `sovereign_probe_${Date.now()}`;
    const probePayload = new TextEncoder().encode('SOVEREIGN_OS_WEBDAV_ZERO_KNOWLEDGE_PROBE');

    try {
      // 1. PUT probe
      await this.uploadChunk(probeHash, probePayload, endpointUrl, username, password);

      // 2. GET probe
      const downloaded = await this.downloadChunk(probeHash, endpointUrl, username, password);
      if (downloaded.byteLength !== probePayload.byteLength) {
        throw new Error('Downloaded probe byte length mismatch.');
      }

      // 3. DELETE probe
      await this.deleteChunk(probeHash, endpointUrl, username, password);

      const elapsed = Math.round(performance.now() - startTime);
      return {
        latencyMs: elapsed,
        message: `WebDAV server verified. Roundtrip drill completed in ${elapsed}ms.`,
      };
    } catch (err) {
      const elapsed = Math.round(performance.now() - startTime);
      throw new Error(`WebDAV verification failed after ${elapsed}ms: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
