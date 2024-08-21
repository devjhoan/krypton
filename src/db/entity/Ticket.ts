import { PrimaryColumn } from "@/utils/database";
import { Column, Entity } from "typeorm";

@Entity()
export class Ticket {
	@PrimaryColumn()
	ticketId: string;

	@Column()
	guildId: string;

	@Column()
	channelId: string;

	@Column()
	userId: string;

	@Column()
	categoryId: string;

	@Column()
	createdAt: Date;
}
