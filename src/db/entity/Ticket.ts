import { PrimaryColumn } from "@/utils/database";
import { Column, Entity } from "typeorm";

@Entity()
export class Ticket {
	@PrimaryColumn()
	ticketId: string;

	@Column("text")
	guildId: string;

	@Column()
	channelId: string;

	@Column()
	userId: string;

	@Column()
	categoryId: string;

	@Column({ default: "" })
	messageControl: string;

	@Column("text", { default: "" })
	claimedBy: string;

	@Column("boolean", { default: false })
	closed: boolean;

	@Column()
	createdAt: Date;
}
