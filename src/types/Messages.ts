import type { APIEmbed, ButtonStyle } from "discord.js";

interface Button {
	Label: string;
	Emoji: string;
	Style: ButtonStyle;
}

const embedsKeys = [
	"GiveawayCreated",
	"GiveawayEnded",
	"GiveawayEntryRegistered",
] as const;

const buttonsKeys = ["GiveawayActiveButton", "GiveawayEndedButton"] as const;
const stringsKeys = ["GiveawayWinnerMessage"] as const;

type EmbedKeys = (typeof embedsKeys)[number];
type ConfigEmbeds = Record<EmbedKeys, Partial<APIEmbed>>;

type StringKeys = (typeof stringsKeys)[number];
type ConfigStrings = Record<StringKeys, string>;

type ButtonKeys = (typeof buttonsKeys)[number];
type ConfigButtons = Record<ButtonKeys, Button>;

export interface MessagesFile {
	Embeds: ConfigEmbeds;
	Strings: ConfigStrings;
	Buttons: ConfigButtons;
}
