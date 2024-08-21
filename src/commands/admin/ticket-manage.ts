import { EmbedSetup, QuestionType } from "@/modules/EmbedSetup";
import { Command } from "@/structures/Command";
import { deepMerge } from "@/db/entity/Guild";
import { v4 as uuidv4 } from "uuid";

import {
	ApplicationCommandOptionType,
	EmbedBuilder,
	type TextChannel,
	type ColorResolvable,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} from "discord.js";
import type { TicketCategory } from "@/types/Guild";

const ticketQuestions = [
	{
		label: "Ticket Name",
		emoji: "🎫",
		key: "name",
		type: QuestionType.Text,
	},
	{
		label: "Ticket Emoji",
		emoji: "🥭",
		key: "emoji",
		type: QuestionType.Text,
	},
	{
		label: "Ticket Category",
		emoji: "📃",
		key: "categoryId",
		type: QuestionType.Category,
	},
	{
		label: "Ticket Roles",
		emoji: "🔒",
		key: "roles",
		type: QuestionType.Roles,
	},
	{
		label: "Button Style",
		emoji: "⚙️",
		key: "buttonStyle",
		type: QuestionType.Button,
	},
	{
		label: "Ticket Id",
		type: QuestionType.Text,
		readonly: true,
		emoji: "🏷",
		key: "id",
	},
] as const;

const selectTicketQuestions = (ticketCategories: TicketCategory[]) =>
	[
		{
			label: "Ticket To Edit",
			emoji: "📃",
			key: "id",
			type: QuestionType.Select,
			selects: ticketCategories.map((ticket) => ({
				label: ticket.name,
				value: ticket.id,
				emoji: ticket.emoji,
				description: `${ticket.id}`,
			})),
		},
	] as const;

export default new Command({
	name: "ticket-manage",
	description: "Configure the ticket system",
	options: [
		{
			name: "setup",
			description: "Create a ticket category",
			type: ApplicationCommandOptionType.Subcommand,
		},
		{
			name: "edit",
			description: "Edit a ticket category",
			type: ApplicationCommandOptionType.Subcommand,
		},
		{
			name: "delete",
			description: "Delete a ticket category",
			type: ApplicationCommandOptionType.Subcommand,
		},
		{
			name: "send",
			description: "Send a ticket create message to the specified channel",
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "channel",
					description: "The channel to send the message to",
					type: ApplicationCommandOptionType.Channel,
					required: false,
				},
			],
		},
	],
	run: async ({ client, interaction }) => {
		const subCommand = interaction.options.getSubcommand();
		let guild = await client.db.guilds.findOneBy({
			guildId: interaction.guild.id,
		});

		if (!guild) {
			guild = await client.db.guilds.save({
				guildId: interaction.guild.id,
			});
		}

		if (subCommand === "setup") {
			const setup = new EmbedSetup({
				client,
				title: "Create a new ticket category",
				description:
					"In this menu you can **create** a new **ticket category**, you have a selector at the bottom to select the option you want to edit.",
				questions: ticketQuestions,
				value: {
					id: uuidv4(),
				},
			});

			const ticket = await setup.run(interaction);
			if (!ticket) return;

			const updatedGuild = deepMerge(
				guild || { guildId: interaction.guild.id },
				{
					ticketCategories: [...(guild?.ticketCategories || []), ticket],
				},
			);

			await client.db.guilds.save(updatedGuild);
			return await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle(
							`The ticket category "${ticket.name}" has been created successfully!`,
						)
						.setColor(client.messages.Strings.DefaultColor as ColorResolvable),
				],
				components: [],
			});
		}

		const ticketCategories = guild?.ticketCategories || [];
		if (!ticketCategories.length) {
			return await interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setTitle("You don't have any ticket categories, create one!")
						.setColor(client.messages.Strings.DefaultColor as ColorResolvable),
				],
				ephemeral: true,
			});
		}

		if (subCommand === "edit") {
			const askTicketToEdit = new EmbedSetup({
				client,
				title: "Select a ticket category to edit",
				description:
					"Use the selector below to select the ticket category you want to edit, you can always create a new ticket category by using the `/ticket-manage setup` command.",
				questions: selectTicketQuestions(ticketCategories),
			});

			const selectedTicket = await askTicketToEdit.run(interaction);
			const ticketToEdit = ticketCategories.find(
				(ticket) => ticket.id === selectedTicket?.id,
			);

			if (!ticketToEdit || !selectedTicket) return;
			const editTicket = new EmbedSetup({
				client,
				title: "Edit a ticket category",
				description:
					"In this menu you can **edit** a existing **ticket category**, you have a selector at the bottom to select the option you want to edit.",
				questions: [...ticketQuestions] as const,
				value: ticketToEdit,
				editReply: true,
			});

			const editedJson = await editTicket.run(interaction);
			if (!editedJson) return;

			const updatedGuild = deepMerge(
				guild || { guildId: interaction.guild.id },
				{
					ticketCategories: ticketCategories.map((ticket) =>
						ticket.id === selectedTicket.id
							? {
									...ticket,
									...editedJson,
								}
							: ticket,
					),
				},
			);

			await client.db.guilds.save(updatedGuild);
			return await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle(
							`${ticketToEdit.emoji} The ticket category ${ticketToEdit.name} has been edited successfully!`,
						)
						.setColor(client.messages.Strings.DefaultColor as ColorResolvable),
				],
				components: [],
			});
		}

		if (subCommand === "delete") {
			const askTicketToDelete = new EmbedSetup({
				client,
				title: "Select a ticket category to delete",
				description:
					"Use the selector below to select the ticket category you want to delete, you can always create a new ticket category by using the `/ticket-manage setup` command.",
				questions: selectTicketQuestions(ticketCategories),
			});

			const selectedTicket = await askTicketToDelete.run(interaction);
			const ticketToDelete = ticketCategories.find(
				(ticket) => ticket.id === selectedTicket?.id,
			);

			if (!ticketToDelete || !selectedTicket) return;
			const updatedGuild = deepMerge(
				guild || { guildId: interaction.guild.id },
				{
					ticketCategories: ticketCategories.filter(
						(ticket) => ticket.id !== selectedTicket.id,
					),
				},
			);

			await client.db.guilds.save(updatedGuild);
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle(
							`${ticketToDelete.emoji} The ticket category ${ticketToDelete.name} has been deleted successfully!`,
						)
						.setColor(client.messages.Strings.DefaultColor as ColorResolvable),
				],
				components: [],
			});
		}

		if (subCommand === "send") {
			const channel = (interaction.options.getChannel("channel") ||
				interaction.channel) as TextChannel;

			const ticketCategoriesToSend = new EmbedSetup({
				client,
				title: "Select ticket categories",
				description:
					"Use the selector below to select the ticket categories you want to send into the channel, you can always create a new ticket category by using the `/ticket-manage setup` command.",
				questions: [
					{
						label: "Ticket Categories",
						emoji: "🎫",
						key: "categories",
						type: QuestionType.MultiSelect,
						selects: ticketCategories.map((ticket) => ({
							label: ticket.name,
							value: ticket.id,
							emoji: ticket.emoji,
							description: `${ticket.id}`,
						})),
					},
				] as const,
				ephemeral: true,
			});

			const selectedCategories = await ticketCategoriesToSend.run(interaction);
			if (!selectedCategories) return;

			const parsedCategories = selectedCategories.categories
				.map((id) => ticketCategories.find((ticket) => ticket.id === id))
				.filter((t) => t !== undefined);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle(
							`🎫 Our system have sent ${selectedCategories.categories.length} ticket categories successfully!`,
						)
						.setColor(client.messages.Strings.DefaultColor as ColorResolvable),
				],
				components: [],
			});

			await channel.send({
				embeds: [
					new EmbedBuilder()
						.setTitle("🎫 Ticket Categories")
						.setColor(client.messages.Strings.DefaultColor as ColorResolvable)
						.setDescription(
							parsedCategories
								.map((ticket) => `${ticket.emoji} ${ticket.name}`)
								.join("\n"),
						),
				],
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						parsedCategories.map((ticket) => {
							return new ButtonBuilder()
								.setEmoji(ticket.emoji)
								.setLabel(ticket.name)
								.setStyle(ButtonStyle.Primary)
								.setCustomId(`ticket-${ticket.id}`);
						}),
					),
				],
			});
		}
	},
});
