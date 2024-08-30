import type Bot from "@/structures/Client";
import type {
	ButtonInteraction,
	ChatInputApplicationCommandData,
	ChatInputCommandInteraction,
	Guild,
	GuildMember,
	InteractionReplyOptions,
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
	permission?: Array<string>;
	directory?: string;
} & ChatInputApplicationCommandData;

export interface CommandsFile {
	BotCommands: Record<string, FileCommand>;
	CustomCommands: Record<string, CustomCommand>;
}

interface FileCommand {
	Enabled: boolean;
	Permissions: Array<string>;
	Cooldown: string;
}

interface CustomCommand extends FileCommand {
	Response: InteractionReplyOptions;
	Description: string;
}
