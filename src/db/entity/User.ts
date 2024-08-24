import { PrimaryColumn } from "@/utils/database";
import { Column, Entity, Unique } from "typeorm";

@Entity()
@Unique(["userId"])
export class User {
	@PrimaryColumn()
	id: string;

	@Column("text")
	userId: string;

	@Column("text")
	guildId: string;

	@Column("number")
	messages: number;
}
