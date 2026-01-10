import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Relation,
} from "typeorm";
import { Order } from "./entity";

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

export default OrderLineItem;
