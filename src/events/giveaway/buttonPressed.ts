import { ActionRowBuilder, ButtonBuilder, Events } from "discord.js";
import replaceAll from "@/utils/replaceAll";
import { Event } from "@/structures/Event";
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

	await interaction
		.update({
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setLabel(
							replaceAll(bot.messages.Buttons.GiveawayActiveButton.Label, {
								"{entries}": giveaway.entries.length + 1,
							}),
						)
						.setStyle(bot.messages.Buttons.GiveawayActiveButton.Style)
						.setEmoji(bot.messages.Buttons.GiveawayActiveButton.Emoji)
						.setDisabled(false)
						.setCustomId("join-giveaway"),
				),
			],
		})
		.catch(console.error);

	await interaction.reply({
		embeds: [replaceAll(bot.messages.Embeds.GiveawayEntryRegistered)],
		ephemeral: true,
	});
});
