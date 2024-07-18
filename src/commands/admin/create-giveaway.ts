import { Command } from "@/structures/Command";
import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import ms from "ms";

export default new Command({
	name: "create-giveaway",
	description: "Create a giveaway",
	options: [
		{
			name: "prize",
			description: "The prize of the giveaway",
			type: ApplicationCommandOptionType.String,
			required: true,
		},
		{
			name: "description",
			description: "The description of the giveaway",
			type: ApplicationCommandOptionType.String,
			required: true,
		},
		{
			name: "winners",
			description: "The number of winners of the giveaway",
			type: ApplicationCommandOptionType.Integer,
			required: true,
		},
		{
			name: "time",
			description: "The time of the giveaway",
			type: ApplicationCommandOptionType.String,
			required: true,
		},
	],
	run: async ({ client, interaction }) => {
		const description = interaction.options.getString("description", true);
		const winnerCount = interaction.options.getInteger("winners", true);
		const prize = interaction.options.getString("prize", true);
		const time = interaction.options.getString("time", true);

		await client.giveawayManager.createGiveaway({
			endDate: new Date(Date.now() + ms(time)),
			channel: interaction.channel,
			hostedBy: interaction.user.id,
			winnerCount,
			description,
			prize,
			time,
		});

		await interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setTitle("🎁 Giveaway")
					.setDescription(`Giveaway created in <#${interaction.channelId}>`)
					.setColor("Aqua"),
			],
			ephemeral: true,
		});
	},
});
