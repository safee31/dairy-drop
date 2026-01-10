import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  Relation,
} from "typeorm";
import { CategoryLevel1 } from "./category-level1.entity";

@Entity("categories")
@Index(["slug"])
@Index(["isActive"])
export class Category {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("varchar", { length: 100, unique: true })
  name!: string;

  @Column("varchar", { length: 50, unique: true })
  slug!: string;

  @Column("varchar", { length: 255, nullable: true })
  description!: string | null;

  @Column("varchar", { length: 255, nullable: true })
  imageUrl!: string | null;

  @Column("int", { default: 0 })
  displayOrder!: number;

  @Column("boolean", { default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => CategoryLevel1, (level1) => level1.category, {
    cascade: true,
    eager: false,
  })
  children!: Relation<CategoryLevel1[]>;
}
