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
import { Order } from "@/models/order";
import type { RefundHistory } from "./refundhistory.entity";

export enum RefundStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum RefundReason {
  SPOILED = "spoiled",
  DAMAGED = "damaged",
  WRONG_ITEM = "wrong_item",
  NOT_DELIVERED = "not_delivered",
  MISSING_ITEMS = "missing_items",
}

export enum RefundMethod {
  ORIGINAL_METHOD = "original_method",
  CARD = "card",
  BANK_TRANSFER = "bank_transfer",
  MOBILE_WALLET = "mobile_wallet",
  DIGITAL_WALLET = "digital_wallet",
  STORE_CREDIT = "store_credit",
  CASH = "cash",
}

export enum RefundPaymentStatus {
  AWAITING = "awaiting",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export interface RefundItem {
  orderLineItemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

@Entity("refunds")
@Index(["orderId"])
@Index(["customerId"])
@Index(["status"])
@Index(["createdAt"])
export class Refund {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Order, { onDelete: "CASCADE" })
  @JoinColumn({ name: "orderId" })
  order!: Relation<Order>;

  @Column("uuid", { name: "orderId" })
  orderId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "customerId" })
  customer!: Relation<User>;

  @Column("uuid", { name: "customerId" })
  customerId!: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "processedById" })
  processedBy!: Relation<User> | null;

  @Column("uuid", { name: "processedById", nullable: true })
  processedById!: string | null;

  @Column({
    type: "enum",
    enum: RefundStatus,
    default: RefundStatus.PENDING,
  })
  status!: RefundStatus;

  @Column({
    type: "enum",
    enum: RefundReason,
  })
  reason!: RefundReason;

  @Column("text", { nullable: true })
  customerNote?: string;

  @Column("text", { nullable: true })
  adminNote?: string;

  @Column("numeric", { precision: 10, scale: 2 })
  amount!: number;

  @Column("varchar", { length: 3, default: "PKR" })
  currency!: string;

  @Column("jsonb", {
    default: () => "'{\"method\":\"original_method\",\"status\":\"awaiting\"}'",
  })
  refundPayment!: {
    method: RefundMethod;
    status: RefundPaymentStatus;
    amountPaid?: number;
    transactionId?: string;
    provider?: string;
    accountDetails?: string;
    paidAt?: Date;
    failureReason?: string;
  };

  @Column("jsonb", { nullable: true })
  refundedItems?: RefundItem[];

  @Column("jsonb", { nullable: true })
  evidenceUrls?: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column("timestamp", { nullable: true })
  processedAt?: Date;

  @OneToMany("RefundHistory", "refund")
  history!: Relation<RefundHistory[]>;
}

export default Refund;
