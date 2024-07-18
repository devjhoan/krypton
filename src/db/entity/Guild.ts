import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class Guild {
	@PrimaryColumn()
	guildId: string;

	@Column({ default: "" })
	logsChannelId: string;
}
