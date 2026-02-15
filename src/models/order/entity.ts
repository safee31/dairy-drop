import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Relation,
} from "typeorm";
import { User } from "@/models/user";
import type { OrderLineItem } from "./orderlineitem.entity";
import type { OrderDeliveryHistory } from "./orderdeliveryhistory.entity";

export enum OrderStatus {
  PENDING = "pending",           // Order placed, awaiting confirmation
  CONFIRMED = "confirmed",       // ✅ ADMIN ACTION: Verified stock & accepted order
  PROCESSING = "processing",     // ⚙️  SYSTEM/AUTO: Items being prepared (warehouse stage)
  CANCELLED = "cancelled",       // Order was cancelled
  COMPLETED = "completed",       // Final state: Delivered & Paid
}

export enum DeliveryStatus {
  AWAITING_PROCESSING = "awaiting_processing", // After confirmation, before warehouse work
  PROCESSING = "processing",                   // Items being gathered/pre-cooled
  PACKING = "packing",                         // Actually being packed into boxes
  PACKED = "packed",                           // Ready for courier pickup
  HANDED_TO_COURIER = "handed_to_courier",     // Given to delivery partner
  OUT_FOR_DELIVERY = "out_for_delivery",       // On the way to customer
  DELIVERED = "delivered",                     // Successfully delivered
  DELIVERY_FAILED = "delivery_failed",         // Delivery attempt failed
}

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
}

export enum PaymentMethod {
  COD = "cod",
}

@Entity("orders")
@Index(["orderNumber"])
@Index(["userId"])
@Index(["status"])
@Index(["createdAt"])
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("bigint", { unique: true })
  orderNumber!: number;

  @ManyToOne(() => User, (user) => user.orders, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: Relation<User>;

  @Column("uuid", { name: "userId" })
  userId!: string;

  @Column({
    type: "enum",
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  @Column({
    type: "enum",
    enum: DeliveryStatus,
    default: DeliveryStatus.AWAITING_PROCESSING,
    nullable: true,
  })
  deliveryStatus?: DeliveryStatus;

  @Column("jsonb")
  deliveryAddress!: {
    fullName: string;
    phoneNumber?: string | null;
    streetAddress: string;
    apartment?: string | null;
    city: string;
    state?: string | null;
    postalCode: string;
    country: string;
    instructions?: string;
  };

  @Column("jsonb", {
    default: () => "'{\"method\":\"cod\",\"status\":\"pending\"}'",
  })
  payment!: {
    method: PaymentMethod;
    status: PaymentStatus;
    paidAt?: Date;
    amountPaid?: number;
    collectedBy?: string;
  };

  @Column("numeric", { precision: 10, scale: 2 })
  subtotal!: number;

  @Column("numeric", { precision: 10, scale: 2, default: 0 })
  deliveryCharge!: number;

  @Column("numeric", { precision: 10, scale: 2, default: 0 })
  taxAmount!: number;

  @Column("numeric", { precision: 10, scale: 2 })
  totalAmount!: number;

  @Column("text", { nullable: true })
  customerNote?: string;

  @Column("text", { nullable: true })
  adminNote?: string;

  @Column("timestamp", { nullable: true })
  deliveredAt?: Date;

  @Column("varchar", { length: 50, nullable: true })
  cancelledBy?: string;

  @Column("text", { nullable: true })
  cancellationReason?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany("OrderLineItem", "order", {
    cascade: true,
  })
  lineItems!: Relation<OrderLineItem[]>;

  @OneToMany("OrderDeliveryHistory", "order")
  deliveryHistory!: Relation<OrderDeliveryHistory[]>;
}

export default Order;
