import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from "typeorm";
import { User } from "../user/entity";

@Entity("roles")
@Index(["type"])
@Index(["isActive"])
export class Role {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("integer", { unique: true })
  type!: number;

  @Column("varchar", { length: 50, unique: true })
  name!: string;

  @Column("varchar", { length: 500, nullable: true })
  description!: string | null;

  @Column("jsonb", { default: {} })
  permissions!: Record<string, boolean>;

  @Column("boolean", { default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => User, (user) => user.role, { nullable: true })
  users!: User[];
}

export default Role;
