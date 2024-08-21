import { Event } from "@/structures/Event";
import bot from "@/index";

import {
	type TextChannel,
	ActionRowBuilder,
	ButtonBuilder,
	Events,
} from "discord.js";
import replaceAll from "@/utils/replaceAll";

export default new Event(Events.InteractionCreate, async (interaction) => {
	if (
		!interaction.guild ||
		!interaction.isButton() ||
		interaction.customId !== "tkt-close"
	)
		return;

	const ticket = await bot.db.tickets.findOneBy({
		channelId: interaction.channelId,
		guildId: interaction.guild.id,
	});

	if (!ticket) return;

	const ticketChannel = interaction.channel as TextChannel;
	await ticketChannel.permissionOverwrites
		.edit(ticket.userId, {
			ViewChannel: false,
		})
		.catch(null);

	await interaction.update({
		components: [
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setLabel(bot.messages.Buttons.CloseTicketButton.Label)
					.setStyle(bot.messages.Buttons.CloseTicketButton.Style)
					.setEmoji(bot.messages.Buttons.CloseTicketButton.Emoji)
					.setDisabled(true)
					.setCustomId("tkt-close"),
				new ButtonBuilder()
					.setLabel(bot.messages.Buttons.ClaimTicketButton.Label)
					.setStyle(bot.messages.Buttons.ClaimTicketButton.Style)
					.setEmoji(bot.messages.Buttons.ClaimTicketButton.Emoji)
					.setDisabled(Boolean(ticket.claimedBy))
					.setCustomId("tkt-claim"),
			),
		],
	});

	const messageControl = await ticketChannel.send({
		embeds: [
			replaceAll(bot.messages.Embeds.TicketManageEmbed, {
				"{user-username}": interaction.user.username,
				"{user-id}": interaction.user.id,
			}),
		],
		components: [
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setLabel(bot.messages.Buttons.TranscriptTicketButton.Label)
					.setStyle(bot.messages.Buttons.TranscriptTicketButton.Style)
					.setEmoji(bot.messages.Buttons.TranscriptTicketButton.Emoji)
					.setCustomId("tkt-transcript"),
				new ButtonBuilder()
					.setLabel(bot.messages.Buttons.OpenTicketButton.Label)
					.setStyle(bot.messages.Buttons.OpenTicketButton.Style)
					.setEmoji(bot.messages.Buttons.OpenTicketButton.Emoji)
					.setCustomId("tkt-open"),
				new ButtonBuilder()
					.setLabel(bot.messages.Buttons.DeleteTicketButton.Label)
					.setStyle(bot.messages.Buttons.DeleteTicketButton.Style)
					.setEmoji(bot.messages.Buttons.DeleteTicketButton.Emoji)
					.setCustomId("tkt-delete"),
			),
		],
	});

	await bot.db.tickets.update(
		{
			ticketId: ticket.ticketId,
		},
		{
			closed: true,
			messageControl: messageControl.id,
		},
	);
});
