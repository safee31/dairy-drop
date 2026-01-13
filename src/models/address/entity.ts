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
import { User } from "../user/entity";

@Entity("addresses")
@Index(["userId", "isActive"])
@Index(["userId", "isPrimary"])
export class Address {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("uuid")
  userId!: string;

  @Column("varchar", { length: 50, nullable: true })
  label!: string | null;

  @Column("varchar", { length: 100 })
  fullName!: string;

  @Column("varchar", { length: 20, nullable: true })
  phoneNumber!: string | null;

  @Column("varchar", { length: 255 })
  streetAddress!: string;

  @Column("varchar", { length: 50, nullable: true })
  apartment!: string | null;

  @Column("varchar", { length: 100 })
  city!: string;

  @Column("varchar", { length: 100, nullable: true })
  state!: string | null;

  @Column("varchar", { length: 20 })
  postalCode!: string;

  @Column("varchar", { length: 100 })
  country!: string;

  @Column("boolean", { default: false })
  isPrimary!: boolean;

  @Column("boolean", { default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => User, (user) => user.addresses, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "userId" })
  user!: Relation<User>;
}

export default Address;
