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
import { Order, DeliveryStatus } from "./entity";

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
  @JoinColumn({ name: "orderId" })
  order!: Relation<Order>;

  @Column("uuid", { name: "orderId" })
  orderId!: string;

  @Column({
    type: "enum",
    enum: DeliveryStatus,
  })
  status!: DeliveryStatus;

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

export default OrderDeliveryHistory;
