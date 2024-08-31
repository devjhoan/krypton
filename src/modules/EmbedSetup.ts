import type { ExtendedInteraction } from "@/types/Command";
import type Bot from "@/structures/Client";
import ms from "ms";

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
	SubQuestion = "subQuestion",
}

interface BaseSetupQuestion<Key extends string, Type extends QuestionType> {
	readonly?: boolean;
	label: string;
	emoji: string;
	type: Type;
	key: Key;
}

interface SelectSetupQuestion<Key extends string>
	extends BaseSetupQuestion<
		Key,
		QuestionType.Select | QuestionType.MultiSelect
	> {
	selects: Array<{
		label: string;
		value: string;
		emoji: string;
		description?: string;
	}>;
}

interface NonSelectSetupQuestion<Key extends string, Type extends QuestionType>
	extends BaseSetupQuestion<Key, Type> {}

interface SubSetupQuestion<Key extends string>
	extends BaseSetupQuestion<Key, QuestionType.SubQuestion> {
	questions: Array<SetupQuestion<string, QuestionType>>;
}

export type SetupQuestion<
	Key extends string,
	Type extends QuestionType,
> = Type extends QuestionType.Select | QuestionType.MultiSelect
	? SelectSetupQuestion<Key>
	: Type extends QuestionType.SubQuestion
		? SubSetupQuestion<Key>
		: NonSelectSetupQuestion<Key, Type>;

type QuestionValueType<
	T extends QuestionType,
	Q extends SetupQuestion<string, QuestionType>[] | undefined,
> = {
	[QuestionType.Text]: string;
	[QuestionType.Number]: number;
	[QuestionType.Boolean]: boolean;
	[QuestionType.Channel]: string;
	[QuestionType.Category]: string;
	[QuestionType.Button]: ButtonStyle;
	[QuestionType.Roles]: Array<string>;
	[QuestionType.MultiSelect]: Array<string>;
	[QuestionType.Role]: string;
	[QuestionType.Select]: string;
	[QuestionType.SubQuestion]: Q extends SetupQuestion<string, QuestionType>[]
		? FinalJsonType<Q>
		: undefined;
}[T];

type FinalJsonType<Q extends readonly SetupQuestion<string, QuestionType>[]> = {
	[K in Q[number]["key"]]: QuestionValueType<
		Extract<Q[number], { key: K }>["type"],
		Extract<Q[number], { key: K }> extends SubSetupQuestion<string>
			? Extract<
					Extract<Q[number], { key: K }>,
					SubSetupQuestion<string>
				>["questions"]
			: []
	>;
};

interface EmbedSetupProps<
	Q extends readonly SetupQuestion<string, QuestionType>[],
> {
	questions: Q;
	title: string;
	client: Bot;
	description?: string;
	value?: Partial<FinalJsonType<Q>>;
	editReply?: boolean;
	ephemeral?: boolean;
	isSubQuestion?: boolean;
}

export class EmbedSetup<
	Q extends readonly SetupQuestion<string, QuestionType>[],
> {
	public finalJson: FinalJsonType<Q>;

	private isSubQuestion: boolean;
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
		isSubQuestion = false,
	}: EmbedSetupProps<Q>) {
		this.isSubQuestion = isSubQuestion;
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
							userOptionResponse as FinalJsonType<Q>[keyof FinalJsonType<Q>];
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
					filter: (i) =>
						i.user.id === interaction.user.id &&
						i.customId.startsWith(this.panelId),
				});

				collector.on("collect", async (i) => {
					if (i.isStringSelectMenu()) {
						collector.resetTimer();

						const question = this.questions.find((q) => q.key === i.values[0]);
						if (!question) return;

						const userOptionResponse = await this.getUserOptionResponse(
							question as Extract<Q[number], { key: Q[number]["key"] }>,
							i,
						);

						if (
							userOptionResponse !== undefined &&
							userOptionResponse !== null
						) {
							this.finalJson[question.key as keyof FinalJsonType<Q>] =
								userOptionResponse as FinalJsonType<Q>[keyof FinalJsonType<Q>];
						}

						const responsePayload = {
							embeds: [this.getEmbedWithValues()],
							components: this.getOptionsComponents(),
						};

						if (this.isSubQuestion) {
							return await i.message.edit(responsePayload);
						}

						return await interaction.editReply(responsePayload);
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
			json[key] = (value?.[key] ||
				this.getDefaultValue(question.type)) as FinalJsonType<Q>[typeof key];
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

		if (option.type === QuestionType.Select) {
			const select = option.selects?.find((select) => select.value === value);
			if (select) {
				return `• ${select.emoji} ${select.label}`;
			}
		}

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
			case QuestionType.MultiSelect:
				return (value as Array<string>).map((string) => `${string}`).join("\n");
			case QuestionType.Button:
				return `• ${displayButtonStyle(value as ButtonStyle)}`;
			case QuestionType.SubQuestion:
				return "• Click to edit";
			default:
				return "• Not Set";
		}
	}

	getOptionsComponents() {
		const submitRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setEmoji("✅")
				.setLabel("Submit")
				.setStyle(ButtonStyle.Success)
				.setDisabled(!this.isFinalJsonValid())
				.setCustomId(`${this.panelId}-embed-setup-submit`),
		);

		if (this.isSubQuestion) {
			submitRow.addComponents(
				new ButtonBuilder()
					.setEmoji("🔙")
					.setLabel("Back")
					.setStyle(ButtonStyle.Secondary)
					.setCustomId(`${this.panelId}-xdembed-setup-submit`),
			);
		}

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
			submitRow,
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
		| string
		| Array<string>
		| boolean
		| ButtonStyle
		| null
		| FinalJsonType<Q>
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
			return value;
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
				return select.values;
			}

			return select.values[0];
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
				return channel?.values[0];
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
					return role?.values;
				}

				return role?.values[0];
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

			return button?.customId === `${customId}-yes`;
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
			);

			return value;
		}

		if (option.type === QuestionType.SubQuestion) {
			const subQuestions = option.questions;
			const questionSetup = new EmbedSetup({
				client: this.bot,
				questions: subQuestions,
				title: option.label,
				ephemeral: false,
				editReply: true,
				isSubQuestion: true,
			});

			const response = await questionSetup.run(
				interaction as ExtendedInteraction,
			);

			if (!response) return null;
			return response as FinalJsonType<Q>;
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
