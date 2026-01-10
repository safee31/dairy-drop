import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
  Relation,
} from "typeorm";
import { Role } from "../role/entity";
import { Address } from "../address/entity";
import { Cart } from "../cart/entity";
import { Order } from "../order/entity";

@Entity("users")
@Index(["email"])
@Index(["isActive", "isVerified"])
@Index(["roleId"])
export class User {
  @PrimaryColumn("varchar", { length: 50 })
  id!: string;

  @Column("varchar", { length: 255, unique: true })
  email!: string;

  @Column("varchar", { length: 255 })
  password!: string;

  @Column("varchar", { length: 100 })
  fullName!: string;

  @Column("varchar", { length: 500, nullable: true })
  profileImage!: string | null;

  @Column("varchar", { length: 20, nullable: true })
  phoneNumber!: string | null;

  @Column("boolean", { default: true })
  isActive!: boolean;

  @Column("boolean", { default: false })
  isVerified!: boolean;

  @Column("timestamp", { nullable: true })
  lastLoginAt!: Date | null;

  @Column("varchar", { length: 50, nullable: true })
  roleId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Role, (role) => role.users, {
    onDelete: "SET NULL",
    nullable: true,
  })
  @JoinColumn({ name: "roleId" })
  role!: Relation<Role> | null;

  @OneToMany(() => Address, (address) => address.user, {
    onDelete: "CASCADE",
  })
  addresses!: Relation<Address[]>;

  @OneToMany(() => Cart, (cart) => cart.user, {
    onDelete: "CASCADE",
  })
  carts!: Relation<Cart[]>;

  @OneToMany(() => Order, (order) => order.user, {
    onDelete: "CASCADE",
  })
  orders!: Relation<Order[]>;
}

export default User;
