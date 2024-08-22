import { validateEmbedObject } from "@/utils/validateEmbedObject";
import { GiveawayManager } from "@/modules/GiveawayManager";
import { config, messages } from "@/utils/getConfigFiles";
import type { CommandType } from "@/types/Command";
import { AppDataSource } from "@/db/data-source";
import type { Event } from "@/structures/Event";
import { embedsKeys } from "@/types/Messages";
import type { DataSource } from "typeorm";
import Logger from "@/utils/Logger";
import { join } from "node:path";
import { glob } from "glob";

import { Giveaway } from "@/db/entity/Giveaway";
import { Ticket } from "@/db/entity/Ticket";
import { Guild } from "@/db/entity/Guild";
import { User } from "@/db/entity/User";

import {
	Client,
	GatewayIntentBits,
	DiscordjsError,
	Collection,
	type ClientEvents,
	ButtonStyle,
} from "discord.js";

class Bot extends Client {
	private _db: DataSource;

	public logger = new Logger();
	public commands: Collection<string, CommandType> = new Collection();
	public giveawayManager: GiveawayManager;
	public messages = messages;
	public config = config;

	public db = {
		guilds: AppDataSource.getRepository(Guild),
		giveaways: AppDataSource.getRepository(Giveaway),
		users: AppDataSource.getRepository(User),
		tickets: AppDataSource.getRepository(Ticket),
	};

	constructor() {
		super({
			intents: [
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.GuildMessageReactions,
				GatewayIntentBits.GuildIntegrations,
				GatewayIntentBits.GuildMembers,
				GatewayIntentBits.GuildWebhooks,
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildModeration,
				GatewayIntentBits.GuildInvites,
				GatewayIntentBits.GuildPresences,
				GatewayIntentBits.GuildScheduledEvents,
				GatewayIntentBits.GuildVoiceStates,
			],
		});

		this.on("ready", this.handleReadyEvent.bind(this));
		this.on("error", this.handleDiscordError.bind(this));
		this.handleErrors();

		this.validateConfigFiles();
		this.login(this.config.GeneralSettings.Token).catch(console.error);
		this.giveawayManager = new GiveawayManager(this);
	}

	private async loadCommands() {
		const guild = this.guilds.cache.first();
		const commandFiles = await glob(
			join(__dirname, "..", "commands", "**/*{.js,ts}"),
		);

		for await (const filePath of commandFiles) {
			const command: CommandType = (await import(filePath))?.default;

			const splitted = filePath.split("/");
			const directory = splitted[splitted.length - 2];

			this.commands.set(command.name, {
				...command,
				directory,
			});
		}

		if (!guild) {
			this.logger.error("No guild found");
			return process.exit(1);
		}

		if (this.commands.size !== (await guild.commands.fetch()).size) {
			this.logger.info("Updating commands on the server...");
			await guild.commands.set(this.commands.toJSON());
		}

		this.logger.success(`Loaded ${this.commands.size} commands`);
	}

	private async loadEvents() {
		const eventFiles = await glob(
			join(__dirname, "..", "events", "**/*{.js,ts}"),
			{ nodir: true },
		);

		for await (const filePath of eventFiles) {
			const event: Event<keyof ClientEvents> = (await import(filePath)).default;
			this.on(event.event, event.run);
		}

		this.logger.success(`Loaded ${eventFiles.length} events`);
	}

	private async handleReadyEvent(client: Client<true>) {
		this.logger.success(`Logged in as ${client.user.tag}`);
		await this.initializeDatabase();

		await this.loadCommands();
		await this.loadEvents();
	}

	public handleDiscordError(error: Error | DiscordjsError) {
		if (
			error.message.includes("Unknown Message") ||
			error.message.includes("Collector")
		) {
			console.log(1);
			return console.log(error);
		}

		if (!(error instanceof Error) || !(error instanceof DiscordjsError)) {
			return this.logger.error(error);
		}

		if (error.code === "TokenInvalid") {
			this.logger.error(
				"You are using an invalid token, please check it and try again.",
			);
			return process.exit(1);
		}
	}

	private async initializeDatabase() {
		this._db = await AppDataSource.initialize();
		this.logger.success(
			`Connected to database ${this._db.driver.database} (${this._db.driver.options.type})`,
		);

		const serverGuild = this.guilds.cache.first();
		if (!serverGuild) {
			this.logger.error("No guild found on the server");
			return process.exit(1);
		}

		const guilds = await this.db.guilds.find();
		if (guilds.length === 0) {
			await this.db.guilds.save({
				guildId: serverGuild.id,
			});

			this.logger.info("Created database entry for the server");
		}
	}

	private validateConfigFiles() {
		let errors = 0;

		for (const button of Object.values(this.messages.Buttons)) {
			if (!Object.values(ButtonStyle).includes(button.Style)) {
				errors++;
				this.logger.error(
					`Button (${button.Label}) has an invalid style (${button.Style})`,
				);
			} else {
				button.Style = Object.values(ButtonStyle).indexOf(button.Style) + 1;
			}
		}

		for (const embed of embedsKeys) {
			const embedConfig = this.messages.Embeds[embed];
			const embedValidation = validateEmbedObject(embedConfig);

			if (!embedConfig) {
				errors++;
				this.logger.error(`Embed (${embed}) was not found, please add it`);
			} else if (!embedValidation.valid) {
				errors++;
				this.logger.error(
					`Embed (${embed}.${embedValidation.key}) is not valid: ${embedValidation.message}`,
				);
			}
		}

		if (errors > 0) {
			process.exit(1);
		} else {
			this.logger.success("All config files are valid and ready");
		}
	}

	private handleErrors() {
		process.on("unhandledRejection", this.handleDiscordError.bind(this));
		process.on("uncaughtException", this.handleDiscordError.bind(this));
	}
}

export default Bot;
