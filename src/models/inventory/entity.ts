import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Relation,
} from "typeorm";
import { Product } from "@/models/product";
import { InventoryHistory } from "@/models/inventoryHistory";

@Entity("inventories")
@Index(["productId"])
@Index(["inStock"])
@Index(["stockQuantity"])
export class Inventory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Product, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product!: Relation<Product>;

  @Column("uuid")
  productId!: string;

  @Column("int", { default: 0 })
  stockQuantity!: number;

  @Column("int", { default: 10 })
  reorderLevel!: number;

  @Column("int", { default: 0 })
  reservedQuantity!: number;

  @Column("varchar", { length: 100, nullable: true })
  batchNumber!: string | null;

  @Column("boolean", { default: false })
  inStock!: boolean;

  @OneToMany(() => InventoryHistory, (history) => history.inventory, {
    cascade: true,
  })
  history!: Relation<InventoryHistory[]>;

  @UpdateDateColumn()
  updatedAt!: Date;

  getAvailableStock(): number {
    return Math.max(0, this.stockQuantity - this.reservedQuantity);
  }

  isLowStock(): boolean {
    return this.getAvailableStock() <= this.reorderLevel;
  }

  canFulfillOrder(quantity: number): boolean {
    return this.getAvailableStock() >= quantity;
  }
}
