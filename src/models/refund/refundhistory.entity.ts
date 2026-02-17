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
import { Refund, RefundStatus } from "./entity";

@Entity("refund_history")
@Index(["refundId"])
@Index(["createdAt"])
export class RefundHistory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Refund, (refund) => refund.history, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "refundId" })
  refund!: Relation<Refund>;

  @Column("uuid", { name: "refundId" })
  refundId!: string;

  @Column({
    type: "enum",
    enum: RefundStatus,
  })
  fromStatus!: RefundStatus;

  @Column({
    type: "enum",
    enum: RefundStatus,
  })
  toStatus!: RefundStatus;

  @Column("text", { nullable: true })
  notes?: string;

  @Column("varchar", { length: 50 })
  changedBy!: string;

  @CreateDateColumn()
  createdAt!: Date;
}

export default RefundHistory;
