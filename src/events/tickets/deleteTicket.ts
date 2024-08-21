import { Events, type TextChannel } from "discord.js";
import replaceAll from "@/utils/replaceAll";
import { Event } from "@/structures/Event";
import bot from "@/index";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default new Event(Events.InteractionCreate, async (interaction) => {
	if (
		!interaction.guild ||
		!interaction.isButton() ||
		interaction.customId !== "tkt-delete"
	)
		return;

	const ticket = await bot.db.tickets.findOneBy({
		channelId: interaction.channelId,
		guildId: interaction.guild.id,
	});

	if (!ticket) return;

	const ticketChannel = interaction.channel as TextChannel;
	await ticketChannel.send({
		embeds: [
			replaceAll(bot.messages.Embeds.DeleteTicketEmbed, {
				"{ticket-id}": ticket.ticketId,
				"{user-username}": interaction.user.username,
			}),
		],
	});

	await interaction.deferUpdate();
	await wait(5000);

	await bot.db.tickets.delete({
		ticketId: ticket.ticketId,
	});

	await ticketChannel.delete();
});
