import { PrimaryColumn } from "@/utils/database";
import { Column, Entity } from "typeorm";

@Entity()
export class User {
	@PrimaryColumn()
	id: string;

	@Column()
	userId: string;

	@Column()
	messages: number;
}
