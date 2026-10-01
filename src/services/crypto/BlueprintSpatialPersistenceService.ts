/* ============================================================
   SOVEREIGN-OS — Zero-Knowledge Blueprint Spatial Persistence Service
   Authenticated AES-256-GCM Envelope Encryption for DAG Spatial Coordinates
   Hydrates volatile RAM layout state across page reloads and route transitions
   ============================================================ */

import { EnvelopeCipher } from './EnvelopeCipher';
import { KeyDerivationBridge } from './KeyDerivationBridge';
import { SyncQueueService } from './SyncQueueService';
import type { EncryptedEnvelope, BlueprintNode, BlueprintNodeType } from '../../types';

export interface NodeGeometry {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BlueprintSpatialState {
  version: number;
  timestamp: number;
  viewport: {
    pan: { x: number; y: number };
    scale: number;
  };
  gridSnap: {
    enabled: boolean;
    size: 16 | 20;
  };
  nodeGeometries: NodeGeometry[];
}

const STORAGE_KEY = 'sovereign_blueprint_spatial_envelope_v1';
const DB_TABLE = 'blueprint_spatial_state';
const DB_RECORD_ID = 'active_viewport_layout';

export class BlueprintSpatialPersistenceService {

  /**
   * Encrypts and persists spatial geometry and viewport state to IndexedDB and local storage.
   */
  public static async sealSpatialLayout(
    nodes: BlueprintNode[],
    viewport: { pan: { x: number; y: number }; scale: number },
    gridSnap: { enabled: boolean; size: 16 | 20 },
    getNodeDimensions: (type: BlueprintNodeType) => { width: number; height: number }
  ): Promise<EncryptedEnvelope> {
    const ctx = KeyDerivationBridge.getContext();

    const payload: BlueprintSpatialState = {
      version: 1,
      timestamp: Date.now(),
      viewport: {
        pan: { x: Math.round(viewport.pan.x), y: Math.round(viewport.pan.y) },
        scale: Number(viewport.scale.toFixed(4)),
      },
      gridSnap,
      nodeGeometries: nodes.map((n) => {
        const dim = getNodeDimensions(n.type);
        return {
          id: n.id,
          x: Math.round(n.x),
          y: Math.round(n.y),
          width: dim.width,
          height: dim.height,
        };
      }),
    };

    // Authenticated AES-256-GCM envelope encryption
    const envelope = await EnvelopeCipher.sealEnvelope<BlueprintSpatialState>(
      payload,
      ctx.masterKek,
      {
        workspaceId: ctx.workspaceId,
        recordId: DB_RECORD_ID,
        fieldName: 'spatial_state',
        schemaVersion: 1,
      }
    );

    // 1. Optimistic IndexedDB persistence
    await SyncQueueService.cacheRecord(DB_TABLE, DB_RECORD_ID, envelope).catch(() => {});

    // 2. Local storage mirroring for zero-delay synchronous recovery
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
      } catch (err) {
        console.warn('[SPATIAL_PERSISTENCE] LocalStorage mirror write warning:', err);
      }
    }

    return envelope;
  }

  /**
   * Unseals encrypted spatial geometry into volatile RAM.
   */
  public static async unsealSpatialLayout(): Promise<BlueprintSpatialState | null> {
    if (!KeyDerivationBridge.isUnlocked()) return null;
    const ctx = KeyDerivationBridge.getContext();

    let envelope: EncryptedEnvelope | null = null;

    // 1. Try IndexedDB
    try {
      envelope = await SyncQueueService.getCachedRecord<EncryptedEnvelope>(DB_TABLE, DB_RECORD_ID);
    } catch {
      // Fallback
    }

    // 2. Try LocalStorage fallback
    if (!envelope && typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          envelope = JSON.parse(raw);
        }
      } catch {
        // Corrupted or unavailable
      }
    }

    if (!envelope) return null;

    try {
      const state = await EnvelopeCipher.unsealEnvelope<BlueprintSpatialState>(
        envelope,
        ctx.masterKek,
        {
          workspaceId: ctx.workspaceId,
          recordId: DB_RECORD_ID,
          fieldName: 'spatial_state',
          schemaVersion: 1,
        }
      );
      return state;
    } catch (err) {
      console.warn('[SPATIAL_PERSISTENCE] Failed to unseal spatial envelope:', err);
      return null;
    }
  }

  /**
   * Clears spatial layout persistence.
   */
  public static clearSpatialLayout(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}
