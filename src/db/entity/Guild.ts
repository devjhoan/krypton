import { Column, Entity, PrimaryColumn, BeforeInsert } from "typeorm";
import type { DotNotation, ValueOf } from "../types";

interface TicketSettings {
	transcriptChannel: string;
	maxTicketsPerUser: number;
	enabled: boolean;
}

@Entity()
export class Guild {
	@PrimaryColumn()
	guildId: string;

	@Column({ default: null })
	logsChannelId: string;

	@Column({ type: "simple-json", nullable: true })
	ticketSettings: TicketSettings;

	@BeforeInsert()
	setDefaultTicketSettings() {
		if (!this.ticketSettings) {
			this.ticketSettings = {
				transcriptChannel: "",
				maxTicketsPerUser: 3,
				enabled: true,
			};
		}
	}

	getValueByString<K extends DotNotation<Guild>>(key: K): ValueOf<Guild, K> {
		return key.split(".").reduce(
			// biome-ignore lint/suspicious/noExplicitAny: This is intentional, we know that `acc` is an object
			(acc, part) => acc && (acc as any)[part],
			this,
		) as unknown as ValueOf<Guild, K>;
	}
}

export function parseGuildDotNotation<K extends DotNotation<Guild>>(
	key: K,
	value: ValueOf<Guild, K>,
): Guild {
	const keys = key.split(".");
	// biome-ignore lint/suspicious/noExplicitAny: we can't do anything here
	const result: any = {};
	let temp = result;

	for (let i = 0; i < keys.length - 1; i++) {
		temp[keys[i]] = {};
		temp = temp[keys[i]];
	}

	temp[keys[keys.length - 1]] = value;

	return result;
}

export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
	for (const key of Object.keys(source) as Array<keyof T>) {
		if (
			source[key] instanceof Object &&
			!Array.isArray(source[key]) &&
			key in target
		) {
			if (target[key] instanceof Object && !Array.isArray(target[key])) {
				Object.assign(
					source[key],
					deepMerge(target[key] as object, source[key] as object),
				);
			}
		}
	}

	return { ...target, ...source };
}
