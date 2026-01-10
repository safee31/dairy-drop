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
import { Inventory } from "@/models/inventory";

@Entity("inventory_history")
@Index(["inventoryId"])
@Index(["type"])
@Index(["createdAt"])
export class InventoryHistory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Inventory, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "inventory_id" })
  inventory!: Relation<Inventory>;

  @Column("uuid", { name: "inventory_id" })
  inventoryId!: string;

  @Column("int")
  quantityChange!: number;

  @Column("int")
  newStockQuantity!: number;

  @Column("varchar", { length: 20 })
  type!: "purchase" | "sale" | "return" | "adjustment" | "initial";

  @Column("varchar", { length: 100, nullable: true })
  referenceId!: string | null;

  @Column("text", { nullable: true })
  notes!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
