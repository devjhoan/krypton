import { defaultJsonify, jsonType, PrimaryColumn } from "@/utils/database";
import type { DotNotation, ValueOf } from "../types";
import { Column, Entity, Unique } from "typeorm";

import type {
	TicketCategory,
	TicketSettings,
	WelcomeSettings,
} from "@/types/Guild";

@Entity()
@Unique(["guildId"])
export class Guild {
	@PrimaryColumn()
	id: string;

	@Column({ unique: true })
	guildId: string;

	@Column({ default: null })
	logsChannelId: string;

	@Column({
		type: jsonType(),
		default: defaultJsonify<WelcomeSettings>({
			enabled: false,
			channel: "",
		}),
	})
	welcomeSettings: WelcomeSettings;

	@Column({ default: 1 })
	ticketsCount: number;

	@Column({
		type: jsonType(),
		default: defaultJsonify<TicketSettings>({
			enabled: true,
			maxTicketsPerUser: 3,
			transcriptChannel: "",
			transcriptOnClose: false,
			transcriptType: "channel",
			saveImagesInTranscript: false,
		}),
	})
	ticketSettings: TicketSettings;

	@Column({
		type: jsonType(),
		nullable: true,
		transformer: {
			to(value: Array<TicketCategory>): string {
				return JSON.stringify(value);
			},
			from(value: string): Array<TicketCategory> {
				return JSON.parse(value);
			},
		},
	})
	ticketCategories: Array<TicketCategory>;

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
