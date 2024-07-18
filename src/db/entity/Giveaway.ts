import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Giveaway {
	@PrimaryGeneratedColumn("uuid")
	giveawayId: string;

	@Column()
	guildId: string;

	@Column()
	messageId: string;

	@Column()
	channelId: string;

	@Column({ default: false })
	ended: boolean;

	@Column({ type: "datetime" })
	endDate: Date;

	@Column({ type: "datetime" })
	startDate: Date;

	@Column({ default: 1 })
	winnerCount: number;

	@Column({ type: "simple-array" })
	winners: Array<string>;

	@Column()
	prize: string;

	@Column()
	description: string;

	@Column()
	hostedBy: string;

	@Column({ type: "simple-array" })
	entries: Array<string>;
}
