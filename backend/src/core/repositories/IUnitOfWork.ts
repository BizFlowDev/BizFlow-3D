/** All repository calls inside run share one transaction. Locks live until commit. */
export interface IUnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T>;
  lock(resource: 'order' | 'customer' | 'product', id: string, storeId: string): Promise<boolean>;
}
