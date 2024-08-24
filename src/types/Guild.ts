import type { ButtonStyle } from "discord.js";

export interface TicketSettings {
	transcriptChannel: string;
	maxTicketsPerUser: number;
	transcriptOnClose: boolean;
	transcriptType: "user" | "channel" | "both";
	saveImagesInTranscript: boolean;
	enabled: boolean;
}

export interface TicketCategory {
	id: string;
	name: string;
	emoji: string;
	categoryId: string;
	buttonStyle: ButtonStyle;
	roles: Array<string>;
}

export interface WelcomeSettings {
	enabled: boolean;
	channel: string;
}
