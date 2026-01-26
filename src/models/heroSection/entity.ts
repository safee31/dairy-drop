import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("hero_sections")
@Index(["isActive"])
@Index(["displayOrder"])
export class HeroSection {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("varchar", { length: 200 })
  title!: string;

  @Column("text")
  description!: string;

  @Column("varchar", { length: 500 })
  imageUrl!: string;

  @Column("varchar", { length: 100, nullable: true })
  imageAlt?: string;

  @Column("jsonb")
  cta!: {
    text: string;
    link: string;
  };

  @Column("int")
  displayOrder!: number;

  @Column("boolean", { default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column("varchar", { length: 100, nullable: true })
  createdBy?: string;

  @Column("varchar", { length: 100, nullable: true })
  updatedBy?: string;

  toggleActive(): boolean {
    this.isActive = !this.isActive;
    return this.isActive;
  }

  isValidCTA(): boolean {
    return !!(this.cta?.text && this.cta?.link);
  }
}
