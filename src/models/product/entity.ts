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
import { CategoryLevel2 } from "../category/category-level2.entity";
import { CategoryLevel1 } from "../category/category-level1.entity";
import { Category } from "../category/category.entity";
import { ProductImage } from "@/models/productImage";

@Entity("products")
@Index(["sku"])
@Index(["categoryId"])
@Index(["categoryLevel1Id"])
@Index(["categoryLevel2Id"])
@Index(["isActive"])
@Index(["brand"])
@Index(["fatContent"])
export class Product {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("varchar", { length: 200 })
  name!: string;

  @Column("text")
  description!: string;

  @Column("varchar", { length: 50, unique: true })
  sku!: string;

  @ManyToOne(() => CategoryLevel2, { nullable: false })
  @JoinColumn({ name: "category_level2_id" })
  categoryLevel2!: Relation<CategoryLevel2>;

  @Column("uuid", { name: "category_level2_id" })
  categoryLevel2Id!: string;

  @ManyToOne(() => CategoryLevel1, { nullable: false })
  @JoinColumn({ name: "category_level1_id" })
  categoryLevel1!: Relation<CategoryLevel1>;

  @Column("uuid", { name: "category_level1_id" })
  categoryLevel1Id!: string;

  @ManyToOne(() => Category, { nullable: false })
  @JoinColumn({ name: "category_id" })
  category!: Relation<Category>;

  @Column("uuid", { name: "category_id" })
  categoryId!: string;

  @Column("numeric", { precision: 10, scale: 2 })
  price!: number;

  @Column("numeric", { precision: 10, scale: 2 })
  salePrice!: number;

  @Column("jsonb", { nullable: true })
  discount?: {
    type: "percentage" | "fixed";
    value: number;
  } | null;

  @Column("varchar", { length: 50 })
  brand!: string;

  @Column("varchar", { length: 30 })
  fatContent!: string;

  @Column("jsonb")
  weight!: {
    value: number;
    unit: "g" | "kg" | "ml" | "L" | "piece";
  };

  @Column("varchar", { length: 50 })
  shelfLife!: string;

  @Column("boolean", { default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => ProductImage, (image) => image.product, {
    cascade: true,
  })
  images!: Relation<ProductImage[]>;
}