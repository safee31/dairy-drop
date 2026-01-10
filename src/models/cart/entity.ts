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
import { CartItem } from "./cartitem.entity";

@Entity("carts")
@Index(["userId"])
export class Cart {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, (user) => user.carts, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: Relation<User>;

  @Column("uuid", { name: "user_id" })
  userId!: string;

  @Column("numeric", { precision: 10, scale: 2, default: 0 })
  subtotal!: number;

  @Column("numeric", { precision: 10, scale: 2, default: 0 })
  deliveryCharge!: number;

  @Column("numeric", { precision: 10, scale: 2, default: 0 })
  taxAmount!: number;

  @Column("numeric", { precision: 10, scale: 2, default: 0 })
  totalAmount!: number;

  @Column("int", { default: 0 })
  totalItems!: number;

  @Column("int", { default: 0 })
  totalQuantity!: number;

  @Column("jsonb", { nullable: true })
  deliveryAddress?: {
    id: string;
    label?: string | null;
    fullName: string;
    phoneNumber?: string | null;
    streetAddress: string;
    apartment?: string | null;
    city: string;
    state?: string | null;
    postalCode: string;
    country: string;
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => CartItem, (item) => item.cart, {
    cascade: true,
  })
  items!: Relation<CartItem[]>;
}

export default Cart;
