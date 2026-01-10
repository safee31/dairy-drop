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

export enum OrderStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  PACKED = "packed",
  OUT_FOR_DELIVERY = "out_for_delivery",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
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
  @JoinColumn({ name: "user_id" })
  user!: Relation<User>;

  @Column("uuid", { name: "user_id" })
  userId!: string;

  @Column({
    type: "enum",
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  @Column("jsonb")
  deliveryAddress!: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
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

  @OneToMany(() => OrderLineItem, (lineItem) => lineItem.order, {
    cascade: true,
  })
  lineItems!: Relation<OrderLineItem[]>;

  @OneToMany(() => OrderDeliveryHistory, (history) => history.order)
  deliveryHistory!: Relation<OrderDeliveryHistory[]>;
}

@Entity("order_line_items")
@Index(["orderId"])
@Index(["productId"])
export class OrderLineItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Order, (order) => order.lineItems, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "order_id" })
  order!: Relation<Order>;

  @Column("uuid", { name: "order_id" })
  orderId!: string;

  @Column("uuid", { name: "product_id" })
  productId!: string;

  @Column("jsonb")
  productSnapshot!: {
    name: string;
    sku: string;
    price: number;
    discount?: {
      type: "percentage" | "fixed";
      value: number;
    };
    brand: string;
    fatContent: string;
    shelfLife: string;
    weight: {
      value: number;
      unit: "g" | "kg" | "ml" | "L" | "piece";
    };
    categoryLevel2Id: string;
    snapshotTimestamp: Date;
  };

  @Column("numeric", { precision: 10, scale: 2 })
  unitPrice!: number;

  @Column("int")
  quantity!: number;

  @Column("numeric", { precision: 10, scale: 2 })
  totalPrice!: number;

  @CreateDateColumn()
  createdAt!: Date;
}

@Entity("order_delivery_history")
@Index(["orderId"])
@Index(["createdAt"])
@Index(["status"])
export class OrderDeliveryHistory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Order, (order) => order.deliveryHistory, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "order_id" })
  order!: Relation<Order>;

  @Column("uuid", { name: "order_id" })
  orderId!: string;

  @Column({
    type: "enum",
    enum: OrderStatus,
  })
  status!: OrderStatus;

  @Column("varchar", { length: 100, nullable: true })
  deliveryPersonName?: string;

  @Column("varchar", { length: 20, nullable: true })
  deliveryPersonPhone?: string;

  @Column("varchar", { length: 100, nullable: true })
  location?: string;

  @Column("text", { nullable: true })
  notes?: string;

  @Column("varchar", { length: 100 })
  updatedBy!: string;

  @CreateDateColumn()
  createdAt!: Date;
}

export default Order;
