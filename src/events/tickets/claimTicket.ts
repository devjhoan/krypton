import replaceAll from "@/utils/replaceAll";
import { Event } from "@/structures/Event";
import bot from "@/index";

import {
	ActionRowBuilder,
	type TextChannel,
	ButtonBuilder,
	Events,
} from "discord.js";

export default new Event(Events.InteractionCreate, async (interaction) => {
	if (
		!interaction.guild ||
		!interaction.isButton() ||
		interaction.customId !== "tkt-claim"
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
			claimedBy: interaction.user.id,
		},
	);

	const guildProfile = await bot.db.guilds.findOneBy({
		guildId: interaction.guild.id,
	});

	if (!guildProfile || !guildProfile?.ticketCategories?.length) return;
	const ticketCategory = guildProfile.ticketCategories.find(
		(category) => category.id === ticket.categoryId,
	);

	if (!ticketCategory) return;
	const channel = interaction.channel as TextChannel;
	for (const roleId of ticketCategory.roles) {
		await channel.permissionOverwrites
			.edit(
				roleId,
				{
					ViewChannel: false,
				},
				{
					reason: `Ticket claimed by ${interaction.user.username}`,
				},
			)
			.catch(null);
	}

	await channel.permissionOverwrites
		.edit(interaction.user.id, {
			ViewChannel: true,
			ManageChannels: true,
		})
		.catch(null);

	await interaction.update({
		components: [
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setLabel(bot.messages.Buttons.CloseTicketButton.Label)
					.setStyle(bot.messages.Buttons.CloseTicketButton.Style)
					.setEmoji(bot.messages.Buttons.CloseTicketButton.Emoji)
					.setDisabled(ticket.closed)
					.setCustomId("tkt-close"),
				new ButtonBuilder()
					.setLabel(bot.messages.Buttons.ClaimTicketButton.Label)
					.setStyle(bot.messages.Buttons.ClaimTicketButton.Style)
					.setEmoji(bot.messages.Buttons.ClaimTicketButton.Emoji)
					.setDisabled(true)
					.setCustomId("tkt-claim"),
			),
		],
	});

	return await channel
		.send({
			embeds: [
				replaceAll(bot.messages.Embeds.ClaimedTicketEmbed, {
					"{user-username}": interaction.user.username,
					"{user-id}": interaction.user.id,
				}),
			],
		})
		.catch(null);
});
