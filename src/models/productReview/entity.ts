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
import { Product } from "@/models/product";
import { Order } from "@/models/order";
import type { ReviewResponse } from "./reviewresponse.entity";

export enum ReviewStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

@Entity("product_reviews")
@Index(["productId"])
@Index(["userId"])
@Index(["orderId"])
@Index(["status"])
@Index(["rating"])
@Index(["createdAt"])
export class ProductReview {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "productId" })
  product!: Relation<Product>;

  @Column("uuid", { name: "productId" })
  productId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: Relation<User>;

  @Column("uuid", { name: "userId" })
  userId!: string;

  @ManyToOne(() => Order, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "orderId" })
  order!: Relation<Order> | null;

  @Column("uuid", { name: "orderId", nullable: true })
  orderId!: string | null;

  @Column("numeric", { precision: 2, scale: 1 })
  rating!: number;

  @Column("text")
  comment!: string;

  @Column({
    type: "enum",
    enum: ReviewStatus,
    default: ReviewStatus.PENDING,
  })
  status!: ReviewStatus;

  @Column("boolean", { default: false })
  isVerifiedPurchase!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany("ReviewResponse", "review")
  responses!: Relation<ReviewResponse[]>;
}

export default ProductReview;
