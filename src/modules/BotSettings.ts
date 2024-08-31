import type { ExtendedInteraction } from "@/types/Command";
import type { DotNotation } from "@/db/types";
import type Bot from "@/structures/Client";
import ms from "ms";

import {
	deepMerge,
	parseGuildDotNotation,
	type Guild,
} from "@/db/entity/Guild";

import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelSelectMenuBuilder,
	ChannelSelectMenuInteraction,
	ChannelType,
	ComponentType,
	EmbedBuilder,
	ModalBuilder,
	RoleSelectMenuBuilder,
	StringSelectMenuBuilder,
	type StringSelectMenuInteraction,
	TextInputBuilder,
	TextInputStyle,
	type ColorResolvable,
	RoleSelectMenuInteraction,
} from "discord.js";

interface Category {
	label: string;
	emoji: string;
	options: ConfigOption[];
}

enum ConfigOptionType {
	Channel = "channel",
	String = "string",
	Number = "number",
	Role = "role",
	Boolean = "boolean",
	Select = "select",
}

interface DefaultOptionKeys {
	label: string;
	databaseKey: DotNotation<Guild>;
}

interface ConfigOptionChannel extends DefaultOptionKeys {
	option: ConfigOptionType.Channel;
	channelType: ChannelType;
}

interface ConfigOptionSelect extends DefaultOptionKeys {
	option: ConfigOptionType.Select;
	choices: Array<{ label: string; value: string; emoji: string }>;
}

interface ConfigDefaultOption extends DefaultOptionKeys {
	option: ConfigOptionType;
}

type ConfigOption =
	| ConfigOptionSelect
	| ConfigOptionChannel
	| ConfigDefaultOption;

const categories: Array<Category> = [
	{
		emoji: "🌎",
		label: "General",
		options: [
			{
				label: "Log Channel",
				option: ConfigOptionType.Channel,
				channelType: ChannelType.GuildText,
				databaseKey: "logsChannelId",
			},
		],
	},
	{
		emoji: "🎫",
		label: "Tickets",
		options: [
			{
				label: "System Enabled",
				option: ConfigOptionType.Boolean,
				databaseKey: "ticketSettings.enabled",
			},
			{
				label: "Transcript Channel",
				option: ConfigOptionType.Channel,
				channelType: ChannelType.GuildText,
				databaseKey: "ticketSettings.transcriptChannel",
			},
			{
				label: "Max Tickets Per User",
				option: ConfigOptionType.Number,
				databaseKey: "ticketSettings.maxTicketsPerUser",
			},
			{
				label: "Automatic Transcript on Close",
				option: ConfigOptionType.Boolean,
				databaseKey: "ticketSettings.transcriptOnClose",
			},
			{
				label: "Transcript Type",
				option: ConfigOptionType.Select,
				databaseKey: "ticketSettings.transcriptType",
				choices: [
					{
						label: "User",
						value: "user",
						emoji: "👤",
					},
					{
						label: "Channel",
						value: "channel",
						emoji: "🧩",
					},
					{
						label: "Both",
						value: "both",
						emoji: "🚀",
					},
				],
			},
			{
				label: "Save Images in Transcripts",
				option: ConfigOptionType.Boolean,
				databaseKey: "ticketSettings.saveImagesInTranscript",
			},
		],
	},
	{
		emoji: "👋",
		label: "Welcome",
		options: [
			{
				label: "System Enabled",
				option: ConfigOptionType.Boolean,
				databaseKey: "welcomeSettings.enabled",
			},
			{
				label: "Welcome Channel",
				option: ConfigOptionType.Channel,
				channelType: ChannelType.GuildText,
				databaseKey: "welcomeSettings.channel",
			},
		],
	},
	{
		emoji: "💰",
		label: "Economy",
		options: [
			{
				label: "Coin Symbol",
				option: ConfigOptionType.String,
				databaseKey: "economySettings.coinSymbol",
			},
			{
				label: "Max Work Earnings",
				option: ConfigOptionType.Number,
				databaseKey: "economySettings.maxWorkEarnings",
			},
			{
				label: "Min Work Earnings",
				option: ConfigOptionType.Number,
				databaseKey: "economySettings.minWorkEarnings",
			},
			{
				label: "Daily Reward",
				option: ConfigOptionType.Number,
				databaseKey: "economySettings.dailyReward",
			},
			{
				label: "Weekly Reward",
				option: ConfigOptionType.Number,
				databaseKey: "economySettings.weeklyReward",
			},
		],
	},
];

export class BotSettings {
	private bot: Bot;

	constructor(bot: Bot) {
		this.bot = bot;
	}

	public async run(interaction: ExtendedInteraction) {
		const message = await interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setTitle("🛠 • Krypton Configuration System")
					.setDescription(
						`👋 Hey **${interaction.user.username}**, Welcome to the Krypton configuration menu.\nIn this menu you can configure most of the **bot options**, you have a **selector** at the bottom, there you can select the **category** you want to edit.\n\n🧩 Currently you can edit a total of **${categories.length} categories** and **${categories.reduce((p, c) => c.options.length + p, 0)} options**.`,
					)
					.setColor(this.bot.messages.Strings.DefaultColor as ColorResolvable),
			],
			components: [await this.createCategorySelectMenu()],
		});

		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			filter: (i) => i.user.id === interaction.user.id,
			time: ms("5m"),
		});

		collector.on("collect", async (i) => {
			if (i.customId === "setup-category") {
				const categoryIdSelected = i.values[0];
				const category = categories.find(
					(category) => category.label === categoryIdSelected,
				);

				if (!category) {
					return await i.reply({
						content: `**${categoryIdSelected}** is not a valid category. Please choose one of the categories.`,
						ephemeral: true,
					});
				}

				const { categoryComponents, categoryEmbed } =
					await this.createCategoryComponents({ category, interaction });

				return await i.update({
					embeds: [categoryEmbed],
					components: [
						categoryComponents,
						await this.createCategorySelectMenu(category.label),
					],
				});
			}

			if (i.customId.startsWith("setup-")) {
				const categoryLabelSelected = i.customId.split("setup-")[1];
				const optionIdSeleceted = i.values[0];

				const category = categories.find(
					(category) => category.label === categoryLabelSelected,
				);

				if (!category) {
					return await i.reply({
						content: `**${categoryLabelSelected}** is not a valid category. Please choose one of the categories.`,
						ephemeral: true,
					});
				}

				const option = category.options.find(
					(option) => option.databaseKey === optionIdSeleceted,
				);

				if (!option) {
					return await i.reply({
						content: `**${optionIdSeleceted}** is not a valid option. Please choose one of the options.`,
						ephemeral: true,
					});
				}

				const userOptionResponse = await this.getUserOptionResponse(
					category,
					option,
					i,
				);

				if (userOptionResponse !== undefined && userOptionResponse !== null) {
					const databasePayload = parseGuildDotNotation(
						option.databaseKey,
						userOptionResponse,
					);

					const guild = await this.bot.db.guilds.findOne({
						where: { guildId: interaction.guild.id },
					});

					const updatedGuild = deepMerge(
						guild || { guildId: interaction.guild.id },
						databasePayload,
					);

					await this.bot.db.guilds.save(updatedGuild);
				}

				const { categoryComponents, categoryEmbed } =
					await this.createCategoryComponents({
						category,
						interaction,
					});

				return await i.editReply({
					embeds: [categoryEmbed],
					components: [
						categoryComponents,
						await this.createCategorySelectMenu(category.label),
					],
				});
			}
		});
	}

	public async getUserOptionResponse(
		category: Category,
		option: ConfigOption,
		interaction: StringSelectMenuInteraction,
	) {
		if (
			option.option === ConfigOptionType.String ||
			option.option === ConfigOptionType.Number
		) {
			const modal = new ModalBuilder()
				.setTitle(`${category.emoji} - ${option.label}`)
				.setCustomId(`setup-${category.label}-${option.label}`)
				.addComponents(
					new ActionRowBuilder<TextInputBuilder>().addComponents(
						new TextInputBuilder()
							.setCustomId("value")
							.setLabel("Value")
							.setValue(
								String(
									await this.getOptionValue(option, interaction.guildId || ""),
								),
							)
							.setStyle(TextInputStyle.Short),
					),
				);

			await interaction.showModal(modal);
			const modalSubmit = await interaction.awaitModalSubmit({
				time: ms("5m"),
				filter: (i) => i.customId === modal.data.custom_id,
			});

			if (!modalSubmit) {
				await interaction.reply({
					content: `**${option.label}** is not a valid option. Please choose one of the options.`,
					ephemeral: true,
				});

				return null;
			}

			const value = modalSubmit.fields.getTextInputValue("value");
			if (!value) {
				await modalSubmit.reply({
					content: `**${option.label}** is not a valid option. Please choose one of the options.`,
					ephemeral: true,
				});

				return null;
			}

			if (option.option === ConfigOptionType.Number) {
				if (Number.isNaN(Number(value))) {
					await modalSubmit.reply({
						content: `**${option.label}** is not a valid number. You can only enter numbers.`,
						ephemeral: true,
					});

					return null;
				}
			}

			if (option.option === ConfigOptionType.String) {
				if (value.length > 100) {
					await modalSubmit.reply({
						content: `**${option.label}** is not a valid string. You can only enter up to 100 characters.`,
						ephemeral: true,
					});

					return null;
				}
			}

			await modalSubmit.deferUpdate();
			return value;
		}

		if (isConfigOptionChannel(option)) {
			const customId = `setup-${category.label}-${option.label}`;
			const message = await interaction.update({
				components: [
					new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
						new ChannelSelectMenuBuilder()
							.setCustomId(customId)
							.setChannelTypes([option.channelType])
							.setPlaceholder("Select a channel")
							.setMinValues(1)
							.setMaxValues(1),
					),
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId(`${customId}-back`)
							.setLabel("Back")
							.setEmoji("◀")
							.setStyle(ButtonStyle.Secondary),
					),
				],
			});

			const channel = await message.awaitMessageComponent({
				time: ms("5m"),
				filter: (i) =>
					i.customId.startsWith(customId) && i.user.id === interaction.user.id,
			});

			if (!channel) {
				await interaction.reply({
					content: `**${option.label}** is not a valid option. Please choose one of the options.`,
					ephemeral: true,
				});
			}

			await channel.deferUpdate();
			if (channel instanceof ChannelSelectMenuInteraction) {
				return channel?.values[0];
			}

			return null;
		}

		if (option.option === ConfigOptionType.Role) {
			const customId = `setup-${category.label}-${option.label}`;
			const message = await interaction.update({
				components: [
					new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
						new RoleSelectMenuBuilder()
							.setCustomId(customId)
							.setMinValues(1)
							.setMaxValues(1)
							.setPlaceholder("Select a role"),
					),
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId(`${customId}-back`)
							.setLabel("Back")
							.setEmoji("◀")
							.setStyle(ButtonStyle.Secondary),
					),
				],
			});

			const role = await message.awaitMessageComponent({
				time: ms("5m"),
				filter: (i) =>
					i.customId === customId && i.user.id === interaction.user.id,
			});

			if (!role) {
				await interaction.reply({
					content: `**${option.label}** is not a valid option. Please choose one of the options.`,
					ephemeral: true,
				});
			}

			await role.deferUpdate();
			if (role instanceof RoleSelectMenuInteraction) {
				return role?.values[0];
			}

			return null;
		}

		if (option.option === ConfigOptionType.Boolean) {
			const customId = `setup-${category.label}-${option.label}`;
			const message = await interaction.update({
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId(`${customId}-yes`)
							.setLabel("Yes")
							.setEmoji("✅")
							.setStyle(ButtonStyle.Success),
						new ButtonBuilder()
							.setCustomId(`${customId}-no`)
							.setLabel("No")
							.setEmoji("✖️")
							.setStyle(ButtonStyle.Danger),
						new ButtonBuilder()
							.setCustomId(`${customId}-back`)
							.setLabel("Back")
							.setEmoji("◀")
							.setStyle(ButtonStyle.Secondary),
					),
				],
			});

			const button = await message.awaitMessageComponent({
				time: ms("5m"),
				filter: (i) =>
					i.customId.startsWith(customId) && i.user.id === interaction.user.id,
				componentType: ComponentType.Button,
			});

			if (!button) {
				await interaction.reply({
					content: `**${option.label}** is not a valid option. Please choose one of the options.`,
					ephemeral: true,
				});
			}

			await button.deferUpdate();
			if (button.customId === `${customId}-back`) {
				return null;
			}

			return button?.customId === `${customId}-yes`;
		}

		if (isConfigOptionSelect(option) && option.choices.length > 0) {
			const customId = `select-${category.label}-${option.label}`;
			const message = await interaction.update({
				components: [
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
						new StringSelectMenuBuilder()
							.setCustomId(customId)
							.setMinValues(1)
							.setMaxValues(1)
							.setOptions(option.choices.map((option) => option))
							.setPlaceholder("Select an option"),
					),
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId(`${customId}-back`)
							.setLabel("Back")
							.setEmoji("◀")
							.setStyle(ButtonStyle.Secondary),
					),
				],
			});

			const select = await message.awaitMessageComponent({
				time: ms("5m"),
				filter: (i) =>
					i.customId.startsWith(customId) && i.user.id === interaction.user.id,
			});

			if (!select) {
				await interaction.reply({
					content: `**${option.label}** is not a valid option. Please choose one of the options.`,
					ephemeral: true,
				});
				return null;
			}

			await select.deferUpdate();
			if (!select.isStringSelectMenu()) {
				return null;
			}

			return select.values[0];
		}
	}

	public async createCategorySelectMenu(selected?: string) {
		return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId("setup-category")
				.setPlaceholder("Select the category you want to configure")
				.addOptions(
					categories
						.filter((category) => category.label !== selected)
						.map((category) => ({
							label: category.label,
							emoji: category.emoji,
							value: category.label,
						})),
				),
		);
	}

	public async createCategoryComponents({
		category,
		interaction,
	}: {
		category: Category;
		interaction: ExtendedInteraction;
	}) {
		const optionsValue = await Promise.all(
			category.options.map(async (option) => ({
				label: option.label,
				value: await this.getOptionValue(option, interaction.guild.id),
				emoji: this.getEmojyByOptionType(option.option),
			})),
		);

		const categoryEmbed = new EmbedBuilder()
			.setTitle(`${category.emoji} You are configuring ${category.label}`)
			.setColor(this.bot.messages.Strings.DefaultColor as ColorResolvable)
			.addFields(
				optionsValue.map((option) => ({
					name: `${option.emoji} ${option.label}`,
					value: `• ${option.value}`,
					inline: true,
				})),
			);

		const categoryComponents =
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId(`setup-${category.label}`)
					.setPlaceholder("Select the option you want to configure")
					.addOptions(
						category.options.map((option) => ({
							label: option.label,
							value: option.databaseKey,
							emoji: this.getEmojyByOptionType(option.option),
						})),
					),
			);

		return { categoryEmbed, categoryComponents };
	}

	public async getOptionValue(option: ConfigOption, guildId: string) {
		let guild = await this.bot.db.guilds.findOneBy({
			guildId,
		});

		if (!guild) {
			guild = await this.bot.db.guilds.save({
				guildId,
			});
		}

		const optionValue = guild.getValueByString(option.databaseKey);
		if (
			optionValue === undefined ||
			optionValue === null ||
			optionValue === ""
		) {
			return "Not Set";
		}

		let selectValue = "";
		if (isConfigOptionSelect(option)) {
			selectValue =
				option.choices.find((c) => c.value === optionValue)?.label || "Not Set";
		}

		switch (option.option) {
			case ConfigOptionType.Channel:
				return `<#${optionValue}>`;
			case ConfigOptionType.String:
				return `${optionValue}`;
			case ConfigOptionType.Number:
				return `${optionValue}`;
			case ConfigOptionType.Role:
				return `<@&${optionValue}>`;
			case ConfigOptionType.Select:
				return `${selectValue}`;
			case ConfigOptionType.Boolean:
				return optionValue ? "Enabled" : "Disabled";
			default:
				return "Not Set";
		}
	}

	public getEmojyByOptionType(option: ConfigOptionType) {
		switch (option) {
			case ConfigOptionType.Channel:
				return "🔗";
			case ConfigOptionType.String:
				return "✏️";
			case ConfigOptionType.Number:
				return "🔢";
			case ConfigOptionType.Role:
				return "🔒";
			case ConfigOptionType.Boolean:
				return "⚙️";
			case ConfigOptionType.Select:
				return "📚";
			default:
				return "❓";
		}
	}
}

function isConfigOptionChannel(
	option: ConfigOption,
): option is ConfigOptionChannel {
	return option.option === ConfigOptionType.Channel;
}

function isConfigOptionSelect(
	option: ConfigOption,
): option is ConfigOptionSelect {
	return option.option === ConfigOptionType.Select;
}
