import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
  Relation,
} from "typeorm";
import { Category } from "./category.entity";
import { CategoryLevel2 } from "./category-level2.entity";

@Entity("category_level1")
@Index(["slug"])
@Index(["isActive"])
@Index(["categoryId"])
export class CategoryLevel1 {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("varchar", { length: 100 })
  name!: string;

  @Column("varchar", { length: 50 })
  slug!: string;

  @Column("varchar", { length: 255, nullable: true })
  description!: string | null;

  @ManyToOne(() => Category, (category) => category.children, {
    nullable: false,
    eager: false,
  })
  @JoinColumn({ name: "category_id" })
  category!: Relation<Category>;

  @Column("uuid")
  categoryId!: string;

  @Column("int", { default: 0 })
  displayOrder!: number;

  @Column("boolean", { default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => CategoryLevel2, (level2) => level2.categoryLevel1, {
    cascade: true,
    eager: false,
  })
  children!: Relation<CategoryLevel2[]>;
}
