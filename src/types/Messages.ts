import type { APIEmbed } from "discord.js";

const embedsKeys = ["GiveawayCreated", "GiveawayEnded"] as const;
const stringsKeys = ["GiveawayWinnerMessage"] as const;

type EmbedKeys = (typeof embedsKeys)[number];
type ConfigEmbeds = Record<EmbedKeys, Partial<APIEmbed>>;

type StringKeys = (typeof stringsKeys)[number];
type ConfigStrings = Record<StringKeys, string>;

export interface MessagesFile {
	Embeds: ConfigEmbeds;
	Strings: ConfigStrings;
}
