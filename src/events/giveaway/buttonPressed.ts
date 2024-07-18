import replaceAll from "@/utils/replaceAll";
import { Event } from "@/structures/Event";
import { Events } from "discord.js";
import bot from "@/index";

export default new Event(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isButton()) return;
	if (interaction.customId !== "join-giveaway") return;

	const giveaway = await bot.giveawayManager.getGiveaway(
		interaction.message.id,
		interaction.channelId,
	);

	if (
		!giveaway ||
		giveaway.ended ||
		giveaway.entries.includes(interaction.user.id)
	)
		return interaction.deferUpdate();

	await bot.giveawayManager.registerUserEntry(
		giveaway.giveawayId,
		interaction.user.id,
	);

	await interaction.reply({
		embeds: [replaceAll(bot.messages.Embeds.GiveawayEntryRegistered)],
		ephemeral: true,
	});
});
