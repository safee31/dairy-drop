import {
  EventSubscriber,
  EntitySubscriberInterface,
  LoadEvent,
} from "typeorm";
import { Order } from "./entity";

/**
 * OrderSubscriber - TypeORM Advanced Feature
 * Automatically formats orderNumber whenever an Order entity is loaded from database
 * Works with ALL retrieval methods: find(), findOne(), createQueryBuilder().getOne(), etc.
 * 
 * Lifecycle Hook: afterLoad
 * - Triggers after database retrieval
 * - Before the entity reaches application code
 * - Transparent formatting for all find operations
 */
@EventSubscriber()
export class OrderSubscriber implements EntitySubscriberInterface<Order> {
  /**
   * Register listener for Order entity
   * This ensures afterLoad hook fires for all Order retrieval operations
   */
  listenTo() {
    return Order;
  }

  /**
   * afterLoad Hook - Automatically formats orderNumber
   * Triggered whenever:
   * - OrderRepo.find()
   * - OrderRepo.findOne()
   * - createQueryBuilder().getOne()
   * - createQueryBuilder().getMany()
   * - Any other retrieval method
   */
  afterLoad(entity: Order, _event?: LoadEvent<Order>): void {
    if (entity && entity.orderNumber) {
      // Auto-format: 11 → "#000011", 1 → "#000001", 45 → "#000045"
      // Store as string, overwriting the numeric orderNumber
      (entity as any).orderNumber = `#${entity.orderNumber
        .toString()
        .padStart(6, "0")}`;
    }
  }
}


