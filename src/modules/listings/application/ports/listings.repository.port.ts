import { ListingEntity } from '../../domain/entities/listing.entity';

export const LISTINGS_REPOSITORY_PORT = Symbol('LISTINGS_REPOSITORY_PORT');

export interface ListingsRepositoryPort {
  save(entity: ListingEntity): Promise<void>;
}
