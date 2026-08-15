export interface SubscriptionPlanRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  features: string[];
  maxEmployees: number;
  isActive: boolean;
  sortOrder: number;
  colorFrom: string | null;
  colorTo: string | null;
  icon: string | null;
  storeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanInput {
  name: string;
  slug: string;
  description?: string;
  price: number;
  features: string[];
  maxEmployees: number;
  isActive?: boolean;
  sortOrder?: number;
  colorFrom?: string;
  colorTo?: string;
  icon?: string;
}

export interface UpdatePlanInput {
  name?: string;
  description?: string;
  price?: number;
  features?: string[];
  maxEmployees?: number;
  isActive?: boolean;
  sortOrder?: number;
  colorFrom?: string;
  colorTo?: string;
  icon?: string;
}

export interface ISubscriptionPlanRepository {
  findAll(): Promise<SubscriptionPlanRow[]>;
  findBySlug(slug: string): Promise<SubscriptionPlanRow | null>;
  findById(id: string): Promise<SubscriptionPlanRow | null>;
  create(input: CreatePlanInput): Promise<SubscriptionPlanRow>;
  update(id: string, input: UpdatePlanInput): Promise<SubscriptionPlanRow>;
  delete(id: string): Promise<void>;
}
