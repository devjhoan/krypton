import type { CommandType } from "@/types/Command";

export class Command {
	constructor(commandOptions: CommandType) {
		Object.assign(this, commandOptions);
	}
}
