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
import { ProductReview } from "./entity";
import { User } from "@/models/user";

@Entity("review_responses")
@Index(["reviewId"])
@Index(["userId"])
export class ReviewResponse {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => ProductReview, (review) => review.responses, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "reviewId" })
  review!: Relation<ProductReview>;

  @Column("uuid", { name: "reviewId" })
  reviewId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: Relation<User>;

  @Column("uuid", { name: "userId" })
  userId!: string;

  @Column("text")
  responseText!: string;

  @CreateDateColumn()
  createdAt!: Date;
}

export default ReviewResponse;
