import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class User {
	@PrimaryColumn()
	userId: string;

	@Column()
	messages: number;
}
