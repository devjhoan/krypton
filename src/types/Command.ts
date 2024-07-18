import type Bot from "@/structures/Client";
import type {
	ButtonInteraction,
	ChatInputApplicationCommandData,
	ChatInputCommandInteraction,
	Guild,
	GuildMember,
	TextChannel,
} from "discord.js";

export interface ExtendedInteraction extends ChatInputCommandInteraction {
	member: GuildMember;
	channel: TextChannel;
	guild: Guild;
}

export interface ExtendedButtonInteraction extends ButtonInteraction {
	member: GuildMember;
	channel: TextChannel;
}

export interface RunOptions {
	client: Bot;
	interaction: ExtendedInteraction;
}

export type CommandType = {
	run: (options: RunOptions) => unknown;
	permission?: string;
	directory?: string;
} & ChatInputApplicationCommandData;
