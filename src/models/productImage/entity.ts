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
import { Product } from "@/models/product";

@Entity("product_images")
@Index(["productId"])
@Index(["isPrimary"])
@Index(["displayOrder"])
export class ProductImage {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("varchar", { length: 255 })
  imageUrl!: string;

  @Column("boolean", { default: false })
  isPrimary!: boolean;

  @Column("int", { default: 0 })
  displayOrder!: number;

  @ManyToOne(() => Product, (product) => product.images, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "productId" })
  product!: Relation<Product>;

  @Column("uuid", { name: "productId" })
  productId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
