import type { ButtonStyle } from "discord.js";

export interface TicketSettings {
	transcriptChannel: string;
	maxTicketsPerUser: number;
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
