export class ListingEntity {
  constructor(
    readonly id: string,
    readonly propertyId: string,
    readonly title: string,
    readonly price: number,
    private status: 'draft' | 'published' = 'draft',
  ) {}

  publish(): void {
    this.status = 'published';
  }

  get currentStatus(): 'draft' | 'published' {
    return this.status;
  }
}
