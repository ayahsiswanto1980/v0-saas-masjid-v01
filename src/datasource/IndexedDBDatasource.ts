// IndexedDB Datasource for offline-first support

export class IndexedDBDatasource {
  private db: IDBDatabase | null = null
  private dbName = 'mosque-saas'
  private version = 1

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores for each module
        const stores = [
          { name: 'users', keyPath: 'id', indexes: [['tenantId', false], ['email', true]] },
          { name: 'jamaah', keyPath: 'id', indexes: [['tenantId', false], ['email', true]] },
          { name: 'donasi', keyPath: 'id', indexes: [['tenantId', false], ['jamaahId', false], ['tanggal', false]] },
          { name: 'takmir', keyPath: 'id', indexes: [['tenantId', false], ['jamaahId', false]] },
          { name: 'ustadz', keyPath: 'id', indexes: [['tenantId', false], ['email', true]] },
          { name: 'kajian', keyPath: 'id', indexes: [['tenantId', false], ['ustadzId', false], ['tanggal', false]] },
          { name: 'aset', keyPath: 'id', indexes: [['tenantId', false], ['kategori', false]] },
          { name: 'notulensi', keyPath: 'id', indexes: [['tenantId', false], ['agendaId', false], ['tanggal', false]] },
          { name: 'agenda', keyPath: 'id', indexes: [['tenantId', false], ['tanggal', false]] },
          { name: 'sync_queue', keyPath: 'id' }, // Track pending syncs
        ]

        stores.forEach(({ name, keyPath, indexes }) => {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath })
            indexes?.forEach(([indexName, unique]) => {
              store.createIndex(indexName, indexName, { unique })
            })
          }
        })
      }
    })
  }

  async create<T extends { id: string }>(storeName: string, item: T): Promise<T> {
    const tx = this.db!.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    store.add(item)

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(item)
      tx.onerror = () => reject(tx.error)
    })
  }

  async read<T>(storeName: string, id: string): Promise<T | null> {
    const tx = this.db!.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.get(id)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async readAll<T>(storeName: string, tenantId: string, limit?: number): Promise<T[]> {
    const tx = this.db!.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const index = store.index('tenantId')
    const range = IDBKeyRange.only(tenantId)
    const request = index.getAll(range, limit)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async update<T extends { id: string }>(storeName: string, item: T): Promise<T> {
    const tx = this.db!.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    store.put(item)

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(item)
      tx.onerror = () => reject(tx.error)
    })
  }

  async delete(storeName: string, id: string): Promise<void> {
    const tx = this.db!.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    store.delete(id)

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async clear(storeName: string): Promise<void> {
    const tx = this.db!.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    store.clear()

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async addToSyncQueue<T>(action: string, storeName: string, data: T): Promise<void> {
    const syncItem = {
      id: `${Date.now()}-${Math.random()}`,
      action,
      storeName,
      data,
      timestamp: Date.now(),
    }
    await this.create('sync_queue', syncItem)
  }

  async getSyncQueue(): Promise<any[]> {
    const tx = this.db!.transaction('sync_queue', 'readonly')
    const store = tx.objectStore('sync_queue')
    const request = store.getAll()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async clearSyncQueue(): Promise<void> {
    await this.clear('sync_queue')
  }
}

export const indexedDBDatasource = new IndexedDBDatasource()
