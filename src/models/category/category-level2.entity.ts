import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
  Relation,
} from "typeorm";
import { CategoryLevel1 } from "./category-level1.entity";

@Entity("category_level2")
@Index(["slug"])
@Index(["isActive"])
@Index(["categoryLevel1Id"])
@Index(["categoryId"])
export class CategoryLevel2 {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("varchar", { length: 100 })
  name!: string;

  @Column("varchar", { length: 50 })
  slug!: string;

  @Column("varchar", { length: 255, nullable: true })
  description!: string | null;

  @ManyToOne(() => CategoryLevel1, (level1) => level1.children, {
    nullable: false,
    eager: false,
  })
  @JoinColumn({ name: "category_level1_id" })
  categoryLevel1!: Relation<CategoryLevel1>;

  @Column("uuid")
  categoryLevel1Id!: string;

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
}
