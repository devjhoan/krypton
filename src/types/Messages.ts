import type { APIEmbed, ButtonStyle } from "discord.js";

interface Button {
	Label: string;
	Emoji: string;
	Style: ButtonStyle;
}

export const embedsKeys = [
	"GiveawayCreated",
	"GiveawayEnded",
	"GiveawayEntryRegistered",
	"UserMessagesEmbed",
	"CreateTicketEmbed",
	"UserAlreadyHaveTicketEmbed",
	"CreatedTicketEmbed",
	"TicketMainEmbed",
	"TicketManageEmbed",
	"OpenedTicketEmbed",
	"ClaimedTicketEmbed",
	"DeleteTicketEmbed",
] as const;

export const buttonsKeys = [
	"GiveawayActiveButton",
	"GiveawayEndedButton",
	"CloseTicketButton",
	"ClaimTicketButton",
	"OpenTicketButton",
	"DeleteTicketButton",
	"TranscriptTicketButton",
] as const;

export const stringsKeys = [
	"GiveawayWinnerMessage",
	"DefaultColor",
	"TicketCategoryParsed",
] as const;

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
