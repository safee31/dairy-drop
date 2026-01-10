import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Relation,
} from "typeorm";
import { Cart } from "./entity";
import { Product } from "@/models/product";

@Entity("cart_items")
@Index(["cartId"])
@Index(["productId"])
export class CartItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "cart_id" })
  cart!: Relation<Cart>;

  @Column("uuid", { name: "cart_id" })
  cartId!: string;

  @ManyToOne(() => Product, { nullable: false })
  @JoinColumn({ name: "product_id" })
  product!: Relation<Product>;

  @Column("uuid", { name: "product_id" })
  productId!: string;

  @Column("int")
  quantity!: number;

  @Column("numeric", { precision: 10, scale: 2 })
  unitPrice!: number;

  @Column("numeric", { precision: 10, scale: 2 })
  totalPrice!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

export default CartItem;
