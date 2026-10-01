/* ============================================================
   SOVEREIGN-OS — Client-Side AWS Signature Version 4 (SigV4) Signer
   Direct browser runtime request signing using Web Crypto API.
   Enables chunk ingestion & diskless RAM streaming directly to/from
   AWS S3, Cloudflare R2, and self-hosted MinIO endpoints without intermediate servers.
   ============================================================ */

export interface SigV4Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface SigV4SignRequestOptions {
  method: 'GET' | 'PUT' | 'POST' | 'DELETE' | 'HEAD';
  url: string;
  region: string;
  service?: string; // default 's3'
  headers?: Record<string, string>;
  payload?: Uint8Array;
  credentials: SigV4Credentials;
  timestamp?: Date;
}

export interface SignedRequestResult {
  url: string;
  method: string;
  headers: Record<string, string>;
  authorizationHeader: string;
  xAmzDate: string;
  payloadHash: string;
}

export class AwsSigV4Signer {
  private static readonly ALGORITHM = 'AWS4-HMAC-SHA256';
  private static clockDriftOffsetMs = 0;

  /**
   * Returns the current globally recorded clock drift offset in milliseconds.
   */
  public static getClockDriftOffset(): number {
    return this.clockDriftOffsetMs;
  }

  /**
   * Sets the global clock drift offset in milliseconds.
   */
  public static setClockDriftOffset(offsetMs: number): void {
    this.clockDriftOffsetMs = offsetMs;
  }

  /**
   * Calculates and records clock drift offset from an HTTP response's Date header:
   * Delta_t = Date.parse(responseHeaders.get('Date')) - Date.now()
   */
  public static recordClockSkewFromHeaders(headers: Headers | Record<string, string>): number | null {
    let dateStr: string | null | undefined = null;
    if (typeof (headers as Headers).get === 'function') {
      dateStr = (headers as Headers).get('date') || (headers as Headers).get('Date') || (headers as Headers).get('x-amz-date');
    } else {
      const rec = headers as Record<string, string>;
      dateStr = rec['date'] || rec['Date'] || rec['x-amz-date'];
    }

    if (dateStr) {
      const serverTime = Date.parse(dateStr);
      if (!isNaN(serverTime)) {
        const drift = serverTime - Date.now();
        this.clockDriftOffsetMs = drift;
        return drift;
      }
    }
    return null;
  }

  /**
   * Executes a fetch request with automatic SigV4 signing and clock-skew recovery.
   * If a RequestTimeTooSkewed error or 403 with Date header is encountered,
   * recalculates clock drift from the server's Date header and retries once with adjusted timestamp.
   */
  public static async executeWithSkewRecovery(
    requestFn: (signed: SignedRequestResult) => Promise<Response>,
    signOptions: Omit<SigV4SignRequestOptions, 'timestamp'>
  ): Promise<Response> {
    const signed = await this.signRequest({
      ...signOptions,
      timestamp: new Date(Date.now() + this.clockDriftOffsetMs),
    });

    let res = await requestFn(signed);

    if (!res.ok && (res.status === 403 || res.status === 400)) {
      const serverDate = res.headers.get('date') || res.headers.get('Date');
      let isSkewed = false;
      let errBody = '';

      try {
        const cloned = res.clone();
        errBody = await cloned.text();
        if (
          errBody.includes('RequestTimeTooSkewed') ||
          errBody.includes('Request has expired') ||
          errBody.includes('SignatureExpired')
        ) {
          isSkewed = true;
        }
      } catch {}

      if (isSkewed || (res.status === 403 && serverDate)) {
        const drift = this.recordClockSkewFromHeaders(res.headers);
        if (drift !== null) {
          const retrySigned = await this.signRequest({
            ...signOptions,
            timestamp: new Date(Date.now() + this.clockDriftOffsetMs),
          });
          res = await requestFn(retrySigned);
        }
      }
    }

    return res;
  }

  /**
   * Computes lowercase hex SHA-256 digest of input data using Web Crypto.
   */
  public static async sha256Hex(data: Uint8Array | BufferSource | string): Promise<string> {
    const buffer =
      typeof data === 'string'
        ? new TextEncoder().encode(data)
        : (data as unknown as BufferSource);
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    const bytes = new Uint8Array(digest);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  /**
   * Computes HMAC-SHA256 using Web Crypto subtle API.
   */
  public static async hmacSha256(
    key: Uint8Array | string,
    message: Uint8Array | string
  ): Promise<Uint8Array> {
    const keyBytes = typeof key === 'string' ? new TextEncoder().encode(key) : key;
    const messageBytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes as unknown as BufferSource,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageBytes as unknown as BufferSource);
    return new Uint8Array(signature);
  }

  /**
   * Converts Uint8Array to lowercase hex string.
   */
  private static bytesToHex(bytes: Uint8Array): string {
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  /**
   * URI-encodes components according to RFC 3986 (preserving unreserved characters: A-Z, a-z, 0-9, -, _, ., ~).
   * Iterates by Unicode code point (for (const ch of input)) to safely handle astral-plane surrogate pairs.
   */
  public static uriEncode(input: string, encodeSlash = false): string {
    let encoded = '';
    for (const ch of input) {
      if (
        (ch >= 'A' && ch <= 'Z') ||
        (ch >= 'a' && ch <= 'z') ||
        (ch >= '0' && ch <= '9') ||
        ch === '_' ||
        ch === '-' ||
        ch === '~' ||
        ch === '.'
      ) {
        encoded += ch;
      } else if (ch === '/' && !encodeSlash) {
        encoded += '/';
      } else {
        encoded += encodeURIComponent(ch);
      }
    }
    return encoded;
  }

  /**
   * Derives the 4-tier HMAC-SHA256 signing key according to AWS SigV4 specification:
   * kDate    = HMAC("AWS4" + secretKey, dateStamp)
   * kRegion  = HMAC(kDate, region)
   * kService = HMAC(kRegion, service)
   * kSigning = HMAC(kService, "aws4_request")
   */
  public static async deriveSigningKey(
    secretKey: string,
    dateStamp: string,
    region: string,
    service = 's3'
  ): Promise<Uint8Array> {
    const kSecret = 'AWS4' + secretKey;
    const kDate = await this.hmacSha256(kSecret, dateStamp);
    const kRegion = await this.hmacSha256(kDate, region);
    const kService = await this.hmacSha256(kRegion, service);
    const kSigning = await this.hmacSha256(kService, 'aws4_request');
    return kSigning;
  }

  /**
   * Signs an HTTP request for AWS S3, Cloudflare R2, or MinIO.
   * Produces an Authorization header and canonical signed headers map.
   */
  public static async signRequest(
    options: SigV4SignRequestOptions
  ): Promise<SignedRequestResult> {
    const {
      method,
      url,
      region,
      service = 's3',
      headers = {},
      payload,
      credentials,
    } = options;

    const timestamp = options.timestamp || new Date(Date.now() + this.clockDriftOffsetMs);
    const parsedUrl = new URL(url);

    // Format timestamps: YYYYMMDD'T'HHMMSS'Z' and YYYYMMDD
    const isoDate = timestamp.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = isoDate.slice(0, 8);

    // Compute payload hash (empty string SHA256 if no payload provided)
    const payloadHash = payload
      ? await this.sha256Hex(payload)
      : await this.sha256Hex('');

    // Prepare headers to sign
    const signHeaders: Record<string, string> = {
      host: parsedUrl.host,
      'x-amz-date': isoDate,
      'x-amz-content-sha256': payloadHash,
    };

    if (credentials.sessionToken) {
      signHeaders['x-amz-security-token'] = credentials.sessionToken;
    }

    // Merge user headers (lower-cased)
    for (const [key, val] of Object.entries(headers)) {
      const lower = key.toLowerCase();
      if (lower !== 'authorization') {
        signHeaders[lower] = val.trim();
      }
    }

    // 1. Task 1: Create Canonical Request
    // Canonical URI
    const canonicalUri = parsedUrl.pathname ? this.uriEncode(parsedUrl.pathname, false) : '/';

    // Canonical Query String
    const queryEntries: Array<[string, string]> = [];
    parsedUrl.searchParams.forEach((value, key) => {
      queryEntries.push([this.uriEncode(key, true), this.uriEncode(value, true)]);
    });
    // Strict byte-order / ordinal comparison matching AWS SigV4 specification
    queryEntries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    const canonicalQueryString = queryEntries.map(([k, v]) => `${k}=${v}`).join('&');

    // Canonical Headers & Signed Headers
    const sortedHeaderKeys = Object.keys(signHeaders).sort();
    let canonicalHeaders = '';
    const signedHeadersList: string[] = [];

    for (const key of sortedHeaderKeys) {
      canonicalHeaders += `${key}:${signHeaders[key].replace(/\s+/g, ' ')}\n`;
      signedHeadersList.push(key);
    }
    const signedHeaders = signedHeadersList.join(';');

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const canonicalRequestHash = await this.sha256Hex(canonicalRequest);

    // 2. Task 2: Create String to Sign
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      this.ALGORITHM,
      isoDate,
      credentialScope,
      canonicalRequestHash,
    ].join('\n');

    // 3. Task 3: Calculate Signature
    const signingKey = await this.deriveSigningKey(
      credentials.secretAccessKey,
      dateStamp,
      region,
      service
    );
    const signatureBytes = await this.hmacSha256(signingKey, stringToSign);
    const signature = this.bytesToHex(signatureBytes);

    // 4. Task 4: Construct Authorization Header
    const authorizationHeader = `${this.ALGORITHM} Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // Final Request Headers
    const finalHeaders: Record<string, string> = {
      ...signHeaders,
      Authorization: authorizationHeader,
    };

    return {
      url,
      method,
      headers: finalHeaders,
      authorizationHeader,
      xAmzDate: isoDate,
      payloadHash,
    };
  }

  /**
   * Builds the target URL for an object within an S3-compatible bucket.
   * Supports custom endpoints (MinIO, R2, Wasabi, LocalStack) and AWS S3 standard endpoints.
   */
  public static buildObjectUrl(
    endpointUrl: string,
    bucketName: string,
    objectKey: string,
    region = 'auto'
  ): string {
    const cleanKey = objectKey.replace(/^\/+/, '');
    const cleanEndpoint = (endpointUrl || '').trim().replace(/\/+$/, '');

    // 1. AWS Standard S3 detection
    if (!cleanEndpoint || cleanEndpoint.includes('amazonaws.com')) {
      const s3Region = region === 'auto' || !region ? 'us-east-1' : region;
      return `https://${bucketName}.s3.${s3Region}.amazonaws.com/${cleanKey}`;
    }

    // 2. Cloudflare R2 path style or custom domain
    if (cleanEndpoint.includes('r2.cloudflarestorage.com')) {
      return `${cleanEndpoint}/${bucketName}/${cleanKey}`;
    }

    // 3. MinIO / Self-Hosted / WebDAV / Custom S3-compatible path-style
    return `${cleanEndpoint}/${bucketName}/${cleanKey}`;
  }
}
