import replaceAll from "@/utils/replaceAll";
import { Event } from "@/structures/Event";
import bot from "@/index";

import {
	type TextChannel,
	ActionRowBuilder,
	ButtonBuilder,
	Events,
} from "discord.js";

export default new Event(Events.InteractionCreate, async (interaction) => {
	if (
		!interaction.guild ||
		!interaction.isButton() ||
		interaction.customId !== "tkt-open"
	)
		return;

	const ticket = await bot.db.tickets.findOneBy({
		channelId: interaction.channelId,
		guildId: interaction.guild.id,
	});

	if (!ticket) return;

	await bot.db.tickets.update(
		{
			ticketId: ticket.ticketId,
		},
		{
			closed: false,
		},
	);

	const ticketChannel = interaction.channel as TextChannel;
	await ticketChannel.permissionOverwrites
		.edit(ticket.userId, {
			ViewChannel: true,
		})
		.catch(null);

	await interaction.deferUpdate();
	await interaction.message.delete().catch(null);

	const pinnedMessages = await ticketChannel.messages.fetchPinned().catch(null);
	const firstMessage = pinnedMessages.first();

	if (firstMessage) {
		await firstMessage
			.edit({
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setLabel(bot.messages.Buttons.CloseTicketButton.Label)
							.setStyle(bot.messages.Buttons.CloseTicketButton.Style)
							.setEmoji(bot.messages.Buttons.CloseTicketButton.Emoji)
							.setDisabled(false)
							.setCustomId("tkt-close"),
						new ButtonBuilder()
							.setLabel(bot.messages.Buttons.ClaimTicketButton.Label)
							.setStyle(bot.messages.Buttons.ClaimTicketButton.Style)
							.setEmoji(bot.messages.Buttons.ClaimTicketButton.Emoji)
							.setDisabled(Boolean(ticket.claimedBy))
							.setCustomId("tkt-claim"),
					),
				],
			})
			.catch(null);
	}

	return await ticketChannel
		.send({
			embeds: [
				replaceAll(bot.messages.Embeds.OpenedTicketEmbed, {
					"{user-username}": interaction.user.username,
					"{user-id}": interaction.user.id,
				}),
			],
		})
		.catch(null);
});
