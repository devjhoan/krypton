import type { ExtendedInteraction } from "@/types/Command";
import type Bot from "@/structures/Client";

import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	StringSelectMenuBuilder,
	type StringSelectMenuInteraction,
	type ColorResolvable,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ChannelSelectMenuBuilder,
	ChannelSelectMenuInteraction,
	RoleSelectMenuBuilder,
	RoleSelectMenuInteraction,
	ChannelType,
} from "discord.js";
import ms from "ms";

export enum QuestionType {
	Text = "text",
	Number = "number",
	Boolean = "boolean",
	Channel = "channel",
	Category = "category",
	Roles = "roles",
	Role = "role",
	Select = "select",
	MultiSelect = "multiSelect",
	Button = "button",
}

interface SetupQuestion<Key extends string, Type extends QuestionType> {
	label: string;
	emoji: string;
	type: Type;
	key: Key;
	readonly?: boolean;
	selects?: Array<{
		label: string;
		value: string;
		emoji: string;
		description?: string;
	}>;
}

type QuestionValueType<T extends QuestionType> = T extends QuestionType.Text
	? string
	: T extends QuestionType.Number
		? number
		: T extends QuestionType.Boolean
			? boolean
			: T extends QuestionType.Channel
				? string
				: T extends QuestionType.Category
					? string
					: T extends QuestionType.Button
						? ButtonStyle
						: T extends QuestionType.Roles
							? Array<string>
							: T extends QuestionType.MultiSelect
								? Array<string>
								: T extends QuestionType.Role
									? string
									: T extends QuestionType.Select
										? string
										: never;

type FinalJsonType<Q extends readonly SetupQuestion<string, QuestionType>[]> = {
	[K in Q[number]["key"]]: QuestionValueType<
		Extract<Q[number], { key: K }>["type"]
	>;
};

interface EmbedSetupProps<
	Q extends readonly SetupQuestion<string, QuestionType>[],
> {
	questions: Q;
	title: string;
	description?: string;
	client: Bot;
	value?: Partial<FinalJsonType<Q>>;
	editReply?: boolean;
	ephemeral?: boolean;
}

export class EmbedSetup<
	Q extends readonly SetupQuestion<string, QuestionType>[],
> {
	public finalJson: FinalJsonType<Q>;

	private description?: string;
	private editReply: boolean;
	private ephemeral: boolean;
	private panelId: string;
	private title: string;
	private questions: Q;
	private bot: Bot;

	constructor({
		questions,
		title,
		description,
		client,
		value,
		editReply = false,
		ephemeral = false,
	}: EmbedSetupProps<Q>) {
		this.description = description;
		this.editReply = editReply;
		this.questions = questions;
		this.ephemeral = ephemeral;
		this.title = title;
		this.bot = client;

		this.panelId = Math.random().toString(36).slice(2, 9);
		this.finalJson = this.initializeFinalJson(value);
	}

	async run(
		interaction: ExtendedInteraction,
	): Promise<FinalJsonType<Q> | null> {
		// biome-ignore lint/suspicious/noAsyncPromiseExecutor: <explanation>
		return new Promise(async (resolve) => {
			try {
				if (this.questions.length === 1) {
					await interaction.deferReply({ ephemeral: this.ephemeral });
					const userOptionResponse = await this.getUserOptionResponse(
						this.questions[0],
						interaction,
					);

					if (userOptionResponse !== undefined && userOptionResponse !== null) {
						this.finalJson[this.questions[0].key as keyof FinalJsonType<Q>] =
							userOptionResponse;
					}

					return resolve(this.finalJson);
				}

				const message = await interaction[
					this.editReply ? "editReply" : "reply"
				]({
					embeds: [this.getEmbedWithValues()],
					components: this.getOptionsComponents(),
					ephemeral: this.ephemeral,
				});

				const collector = message.createMessageComponentCollector({
					time: ms("5m"),
					filter: (i) => i.customId.startsWith(this.panelId),
				});

				collector.on("collect", async (i) => {
					if (i.isStringSelectMenu()) {
						collector.resetTimer();

						const question = this.questions.find((q) => q.key === i.values[0]);
						if (!question) return;

						const userOptionResponse = await this.getUserOptionResponse(
							question,
							i,
						);

						if (
							userOptionResponse !== undefined &&
							userOptionResponse !== null
						) {
							this.finalJson[question.key as keyof FinalJsonType<Q>] =
								userOptionResponse;
						}

						return await interaction.editReply({
							embeds: [this.getEmbedWithValues()],
							components: this.getOptionsComponents(),
						});
					}

					if (i.isButton() && i.customId.endsWith("embed-setup-submit")) {
						await i.deferUpdate();
						return collector.stop("finish");
					}
				});

				collector.on("end", (_, reason) => {
					if (reason !== "finish") return null;
					return resolve(this.finalJson);
				});
			} catch (error) {
				this.bot.handleDiscordError(error as Error);
				return resolve(null);
			}
		});
	}

	private isFinalJsonValid(): boolean {
		return Object.entries(this.finalJson).every(([key, value]) => {
			const question = this.questions.find((q) => q.key === key);
			if (!question) return false;

			if (question.type === QuestionType.Button && typeof value !== "number") {
				return false;
			}

			if (Array.isArray(value)) {
				return value.length > 0;
			}

			return value !== null;
		});
	}

	private initializeFinalJson(
		value?: Partial<FinalJsonType<Q>>,
	): FinalJsonType<Q> {
		const json: Partial<FinalJsonType<Q>> = {};
		for (const question of this.questions) {
			const key = question.key as keyof FinalJsonType<Q>;
			json[key] = (this.getDefaultValue(question.type) ||
				value?.[key]) as FinalJsonType<Q>[typeof key];
		}

		return json as FinalJsonType<Q>;
	}

	private getDefaultValue(type: QuestionType) {
		switch (type) {
			case QuestionType.Text:
				return null;
			case QuestionType.Number:
				return null;
			case QuestionType.Boolean:
				return false;
			case QuestionType.Channel:
				return null;
			case QuestionType.Category:
				return null;
			case QuestionType.Roles:
				return [];
			case QuestionType.MultiSelect:
				return [];
			case QuestionType.Role:
				return null;
			case QuestionType.Select:
				return null;
			default:
				return null;
		}
	}

	private getOptionValue(
		value: unknown,
		option?: SetupQuestion<string, QuestionType>,
	) {
		if (value === undefined || value === null) {
			return "Not Set";
		}

		if (Array.isArray(value) && !value.length) {
			return "Not Set";
		}

		if (option === undefined) {
			return value;
		}

		const select = option.selects?.find((select) => select.value === value);

		switch (option.type) {
			case QuestionType.Category:
				return `• <#${value}>`;
			case QuestionType.Channel:
				return `• <#${value}>`;
			case QuestionType.Text:
				return `• ${value}`;
			case QuestionType.Number:
				return `• ${value}`;
			case QuestionType.Role:
				return `• <@&${value}>`;
			case QuestionType.Boolean:
				return value ? "• Enabled" : "• Disabled";
			case QuestionType.Roles:
				return (value as Array<string>).map((role) => `<@&${role}>`).join("\n");
			case QuestionType.Select:
				return `• ${select ? `${select.emoji} ${select.label}` : "Not Set"}`;
			case QuestionType.MultiSelect:
				return (value as Array<string>).map((string) => `${string}`).join("\n");
			case QuestionType.Button:
				return `• ${displayButtonStyle(value as ButtonStyle)}`;
			default:
				return "• Not Set";
		}
	}

	getOptionsComponents() {
		return [
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId(`${this.panelId}-embed-setup-questions`)
					.setPlaceholder("Select the property you want to edit")
					.addOptions(
						this.questions
							.filter((question) => question.readonly !== true)
							.map((question) => ({
								label: question.label,
								emoji: question.emoji,
								value: question.key,
							})),
					),
			),
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setEmoji("✅")
					.setLabel("Submit")
					.setStyle(ButtonStyle.Success)
					.setDisabled(!this.isFinalJsonValid())
					.setCustomId(`${this.panelId}-embed-setup-submit`),
			),
		];
	}

	getEmbedWithValues() {
		const embed = new EmbedBuilder()
			.setTitle(`🛠 ${this.title}`)
			.setColor(this.bot.messages.Strings.DefaultColor as ColorResolvable)
			.addFields(
				Object.entries(this.finalJson).map(([key, value]) => {
					const question = this.questions.find((q) => q.key === key);

					return {
						name: `${question?.emoji} ${question?.label}`,
						value: `${this.getOptionValue(value, question) ?? "Not Set"}`,
						inline: true,
					};
				}),
			);

		if (this.description) {
			embed.setDescription(this.description);
		}

		return embed;
	}

	public async getUserOptionResponse(
		option: SetupQuestion<string, QuestionType>,
		baseInteraction: StringSelectMenuInteraction | ExtendedInteraction,
	): Promise<
		| QuestionValueType<Extract<Q[number], { key: Q[number]["key"] }>["type"]>
		| null
		| undefined
	> {
		const interaction = baseInteraction;
		if (baseInteraction.isStringSelectMenu()) {
			interaction.editReply = baseInteraction.update;
		}

		if (
			option.type === QuestionType.Text ||
			option.type === QuestionType.Number
		) {
			const modal = new ModalBuilder()
				.setTitle(`${option.label}`)
				.setCustomId(`setup-${option.label}`)
				.addComponents(
					new ActionRowBuilder<TextInputBuilder>().addComponents(
						new TextInputBuilder()
							.setCustomId("value")
							.setLabel("Value")
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

			if (option.type === QuestionType.Number) {
				if (Number.isNaN(Number(value))) {
					await modalSubmit.reply({
						content: `**${option.label}** is not a valid number. You can only enter numbers.`,
						ephemeral: true,
					});

					return null;
				}
			}

			if (option.type === QuestionType.Text) {
				if (value.length > 100) {
					await modalSubmit.reply({
						content: `**${option.label}** is not a valid string. You can only enter up to 100 characters.`,
						ephemeral: true,
					});

					return null;
				}
			}

			await modalSubmit.deferUpdate();
			return value as QuestionValueType<
				Extract<Q[number], { key: Q[number]["key"] }>["type"]
			>;
		}

		if (
			option.type === QuestionType.Select ||
			option.type === QuestionType.MultiSelect
		) {
			const customId = `setup-${option.label}`;
			const message = await interaction.editReply({
				components: [
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
						new StringSelectMenuBuilder()
							.setCustomId(customId)
							.setMinValues(1)
							.setMaxValues(
								option.type === QuestionType.Select
									? 1
									: option.selects?.length || 2,
							)
							.addOptions(
								option.selects?.map((select) => ({
									label: select.label,
									value: select.value,
									description: select?.description,
									emoji: select.emoji,
								})) || [],
							),
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
				filter: (i) => i.customId === customId,
				componentType: ComponentType.StringSelect,
			});

			if (!select) {
				await interaction.reply({
					content: `**${option.label}** is not a valid option. Please choose one of the options.`,
					ephemeral: true,
				});
				return null;
			}

			await select.deferUpdate();
			if (option.type === QuestionType.MultiSelect) {
				return select.values as QuestionValueType<
					Extract<Q[number], { key: Q[number]["key"] }>["type"]
				>;
			}

			return select.values[0] as QuestionValueType<
				Extract<Q[number], { key: Q[number]["key"] }>["type"]
			>;
		}

		if (
			option.type === QuestionType.Channel ||
			option.type === QuestionType.Category
		) {
			const customId = `setup-${option.label}`;
			const message = await interaction.editReply({
				components: [
					new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
						new ChannelSelectMenuBuilder()
							.setCustomId(customId)
							.setPlaceholder("Select a channel")
							.setMinValues(1)
							.addChannelTypes(
								option.type === QuestionType.Channel
									? ChannelType.GuildText
									: ChannelType.GuildCategory,
							)
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
				filter: (i) => i.customId.startsWith(customId),
			});

			if (!channel) {
				await interaction.reply({
					content: `**${option.label}** is not a valid option. Please choose one of the options.`,
					ephemeral: true,
				});
			}

			await channel.deferUpdate();
			if (channel instanceof ChannelSelectMenuInteraction) {
				return channel?.values[0] as QuestionValueType<
					Extract<Q[number], { key: Q[number]["key"] }>["type"]
				>;
			}

			return null;
		}

		if (
			option.type === QuestionType.Role ||
			option.type === QuestionType.Roles
		) {
			const customId = `setup-${option.label}`;
			const message = await interaction.editReply({
				components: [
					new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
						new RoleSelectMenuBuilder()
							.setCustomId(customId)
							.setMinValues(1)
							.setMaxValues(option.type === QuestionType.Roles ? 25 : 1)
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
				filter: (i) => i.customId === customId,
			});

			if (!role) {
				await interaction.reply({
					content: `**${option.label}** is not a valid option. Please choose one of the options.`,
					ephemeral: true,
				});
			}

			await role.deferUpdate();
			if (role instanceof RoleSelectMenuInteraction) {
				if (option.type === QuestionType.Roles) {
					return role?.values as QuestionValueType<
						Extract<Q[number], { key: Q[number]["key"] }>["type"]
					>;
				}

				return role?.values[0] as QuestionValueType<
					Extract<Q[number], { key: Q[number]["key"] }>["type"]
				>;
			}

			return null;
		}

		if (option.type === QuestionType.Boolean) {
			const customId = `setup-${option.label}`;
			const message = await interaction.editReply({
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
							.setEmoji("⛔")
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
				filter: (i) => i.customId.startsWith(customId),
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

			return (button?.customId === `${customId}-yes`) as QuestionValueType<
				Extract<Q[number], { key: Q[number]["key"] }>["type"]
			>;
		}

		if (option.type === QuestionType.Button) {
			const customId = `setup-${option.label}`;
			const message = await interaction.editReply({
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId(`${customId}-primary`)
							.setLabel("Primary")
							.setStyle(ButtonStyle.Primary),
						new ButtonBuilder()
							.setCustomId(`${customId}-secondary`)
							.setLabel("Secondary")
							.setStyle(ButtonStyle.Secondary),
						new ButtonBuilder()
							.setCustomId(`${customId}-success`)
							.setLabel("Success")
							.setStyle(ButtonStyle.Success),
						new ButtonBuilder()
							.setCustomId(`${customId}-danger`)
							.setLabel("Danger")
							.setStyle(ButtonStyle.Danger),
					),
				],
			});

			const button = await message.awaitMessageComponent({
				time: ms("5m"),
				filter: (i) => i.customId.startsWith(customId),
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

			const value = parseButtonStyle(
				capitalize(button?.customId.replace(`${customId}-`, "")),
			) as QuestionValueType<
				Extract<Q[number], { key: Q[number]["key"] }>["type"]
			>;

			return value;
		}
	}
}

const displayButtonStyle = (style: ButtonStyle) => {
	switch (style) {
		case ButtonStyle.Primary:
			return "Primary";
		case ButtonStyle.Secondary:
			return "Secondary";
		case ButtonStyle.Success:
			return "Success";
		case ButtonStyle.Danger:
			return "Danger";
		case ButtonStyle.Link:
			return "Link";
	}
};

const parseButtonStyle = (style: string) => {
	switch (style) {
		case "Primary":
			return ButtonStyle.Primary;
		case "Secondary":
			return ButtonStyle.Secondary;
		case "Success":
			return ButtonStyle.Success;
		case "Danger":
			return ButtonStyle.Danger;
		case "Link":
			return ButtonStyle.Link;
		default:
			return ButtonStyle.Primary;
	}
};

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
