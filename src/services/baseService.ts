import prisma from '@/lib/prisma';

/**
 * Base service class with common CRUD operations
 * This class can be extended by specific service classes to reduce code duplication
 */
export class BaseService<T extends Record<string, any>> {
  protected readonly model: any;
  protected readonly includedRelations: Record<string, boolean | object>;

  /**
   * Constructor for the base service
   * @param model - The Prisma model to use (e.g., prisma.event, prisma.ticket)
   * @param includedRelations - Relations to include in query results
   */
  constructor(model: any, includedRelations: Record<string, boolean | object> = {}) {
    this.model = model;
    this.includedRelations = includedRelations;
  }

  /**
   * Get an entity by ID
   */
  async getById(id: string): Promise<T | null> {
    return this.model.findUnique({
      where: { id },
      include: this.includedRelations
    }) as Promise<T | null>;
  }

  /**
   * Get all entities with pagination and filtering
   */
  async getAll(params: {
    skip?: number;
    take?: number;
    where?: Record<string, any>;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<T[]> {
    const { skip, take, where, orderBy } = params;
    return this.model.findMany({
      skip,
      take,
      where,
      orderBy,
      include: this.includedRelations
    }) as Promise<T[]>;
  }

  /**
   * Create a new entity
   */
  async create(data: Record<string, any>): Promise<T> {
    return this.model.create({
      data,
      include: this.includedRelations
    }) as Promise<T>;
  }

  /**
   * Update an entity
   */
  async update(id: string, data: Record<string, any>): Promise<T> {
    return this.model.update({
      where: { id },
      data,
      include: this.includedRelations
    }) as Promise<T>;
  }

  /**
   * Delete an entity
   */
  async delete(id: string): Promise<T> {
    return this.model.delete({
      where: { id },
      include: this.includedRelations
    }) as Promise<T>;
  }

  /**
   * Count entities with optional filtering
   */
  async count(where?: Record<string, any>): Promise<number> {
    return this.model.count({ where });
  }
}