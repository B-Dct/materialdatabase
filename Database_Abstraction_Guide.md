# Database Layer Abstraction & Migration Guide

## 1. Overview
We have successfully abstracted the database layer of the Material Database application. The application no longer communicates directly with Supabase in the core logic (`store.ts`). Instead, it uses a **Repository Pattern**.

### Architecture Change
**Before:**
`React Components` -> `Zustand Store` -> `Supabase Client (Direct)`

**After:**
`React Components` -> `Zustand Store` -> `StorageRepository (Interface)` -> `SupabaseStorage (Adapter)`

Measurements, materials, layups, and assemblies are now backend-agnostic.

---

## 2. Interface Definitions
The core contract is defined in `src/lib/storage/types.ts`. Any new database adapter must implement the `StorageRepository` interface.

```typescript
export interface StorageRepository {
    // Materials
    getMaterials(): Promise<Material[]>;
    createMaterial(material: Omit<Material, 'id' | ...>): Promise<Material>;
    updateMaterial(id: string, updates: Partial<Material>): Promise<void>;
    deleteMaterial(id: string): Promise<void>;
    
    // ... same for Layups, Assemblies, etc.
}
```

---

## 3. Guide: Migrating to MariaDB
To switch the backend from Supabase (PostgreSQL) to a release-hosted MariaDB/MySQL database, follow these steps.

### Step 1: Backend Setup
Unlike Supabase, MariaDB does not provide a client-side API out of the box. You will need a backend server (API) to talk to the database securely.
*   **Infrastructure**: Set up a Node.js server (e.g., using Express, NestJS, or Hono).
*   **Database**: Host a MariaDB instance.
*   **API**: Create endpoints (REST or GraphQL) that match the application needs (e.g., `GET /materials`, `POST /materials`).

### Step 2: Implement the Adapter
Create a new file `src/lib/storage/MariaDBStorage.ts`. This class will implement `StorageRepository`. Instead of calling Supabase SDK, it will call your new API (or the DB driver directly if using Electron/Server-Side execution).

**Example `MariaDBStorage.ts`:**
```typescript
import { StorageRepository } from './types';
import type { Material } from '@/types/domain';

export class MariaDBStorage implements StorageRepository {
    private baseUrl = 'https://api.your-company.com/v1';

    async getMaterials(): Promise<Material[]> {
        // Fetch from your own API
        const response = await fetch(`${this.baseUrl}/materials`);
        if (!response.ok) throw new Error('Failed to fetch materials');
        return await response.json();
    }

    async createMaterial(material: Omit<Material, 'id' | ...>): Promise<Material> {
        const response = await fetch(`${this.baseUrl}/materials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(material)
        });
        return await response.json();
    }

    // ... implement remaining methods (delete, update, etc.)
}
```

### Step 3: Switch the Store
Once the adapter is written, update `src/lib/store.ts` to use it.

**In `src/lib/store.ts`:**
```typescript
// import { SupabaseStorage } from './storage/SupabaseStorage';
import { MariaDBStorage } from './storage/MariaDBStorage'; 

// Initialize the new storage
const storage = new MariaDBStorage(); // Switch here!

// The rest of the store code remains 100% unchanged.
```

### Summary
By following this pattern, the frontend UI and business logic (validation, state management) never need to know *which* database is saving the data. You only swap the "driver" (Adapter).
