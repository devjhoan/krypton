import { PrimaryColumn } from "@/utils/database";
import { Column, Entity } from "typeorm";

@Entity()
export class User {
	@PrimaryColumn()
	userId: string;

	@Column()
	messages: number;
}
