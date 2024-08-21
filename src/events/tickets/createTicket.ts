import replaceAll from "@/utils/replaceAll";
import { Event } from "@/structures/Event";
import bot from "@/index";

import {
	PermissionFlagsBits,
	ActionRowBuilder,
	ButtonBuilder,
	Events,
} from "discord.js";

export default new Event(Events.InteractionCreate, async (interaction) => {
	if (
		!interaction.guild ||
		!interaction.isButton() ||
		!interaction.customId.startsWith("ticket-")
	)
		return;

	const ticketId = interaction.customId.split("ticket-")[1];
	const guildProfile = await bot.db.guilds.findOneBy({
		guildId: interaction.guild.id,
	});

	if (!guildProfile || !guildProfile.ticketSettings.enabled) return;
	const ticket = guildProfile.ticketCategories.find(
		(category) => category.id === ticketId,
	);

	if (!ticket) return;
	const userTickets = await bot.db.tickets.count({
		where: {
			guildId: interaction.guild.id,
			userId: interaction.user.id,
		},
	});

	if (userTickets >= guildProfile.ticketSettings.maxTicketsPerUser) {
		return await interaction.reply({
			embeds: [replaceAll(bot.messages.Embeds.UserAlreadyHaveTicketEmbed)],
			ephemeral: true,
		});
	}

	const ticketsCount = (guildProfile.ticketsCount || 0) + 1;
	await bot.db.guilds.update(
		{
			guildId: interaction.guild.id,
		},
		{
			ticketsCount: ticketsCount,
		},
	);

	const userPermissions = [
		PermissionFlagsBits.ViewChannel,
		PermissionFlagsBits.SendMessages,
		PermissionFlagsBits.AttachFiles,
		PermissionFlagsBits.EmbedLinks,
	];

	const channel = await interaction.guild.channels.create({
		name: `ticket-${String(guildProfile.ticketsCount).padStart(4, "0")}`,
		parent: ticket.categoryId,
		permissionOverwrites: [
			{
				id: interaction.guild.id,
				deny: [PermissionFlagsBits.ViewChannel],
			},
			{
				id: interaction.user.id,
				allow: userPermissions,
			},
			...ticket.roles.map((role) => ({
				id: role,
				allow: userPermissions,
			})),
		],
	});

	await interaction.reply({
		embeds: [
			replaceAll(bot.messages.Embeds.CreatedTicketEmbed, {
				"{channel-id}": channel.id,
			}),
		],
		ephemeral: true,
	});

	const message = await channel.send({
		embeds: [
			replaceAll(bot.messages.Embeds.TicketMainEmbed, {
				"{emoji}": ticket.emoji,
				"{name}": ticket.name,
				"{user-id}": interaction.user.id,
				"{timestamp}": Math.floor(Date.now() / 1000),
			}),
		],
		components: [
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setLabel(bot.messages.Buttons.CloseTicketButton.Label)
					.setStyle(bot.messages.Buttons.CloseTicketButton.Style)
					.setEmoji(bot.messages.Buttons.CloseTicketButton.Emoji)
					.setCustomId("tkt-close"),
				new ButtonBuilder()
					.setLabel(bot.messages.Buttons.ClaimTicketButton.Label)
					.setStyle(bot.messages.Buttons.ClaimTicketButton.Style)
					.setEmoji(bot.messages.Buttons.ClaimTicketButton.Emoji)
					.setCustomId("tkt-claim"),
			),
		],
	});

	await message.pin("Save ticket message to avoid losing it");
	await channel.bulkDelete(1);

	await bot.db.tickets.save({
		userId: interaction.user.id,
		guildId: interaction.guild.id,
		categoryId: ticket.id,
		channelId: channel.id,
		createdAt: new Date(),
		claimedBy: "",
		closed: false,
		messageControl: "",
	});
});
