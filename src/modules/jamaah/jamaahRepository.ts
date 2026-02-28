import { BaseRepository } from '@/repositories/BaseRepository'
import { Jamaah } from '@/stores/jamaahStore'

export class JamaahRepository extends BaseRepository<Jamaah> {
  protected storeName = 'jamaah'
  protected apiEndpoint = '/jamaah'
}

export const jamaahRepository = new JamaahRepository()
