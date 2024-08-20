import { ApplicationCommandOptionType } from "discord.js";
import { Command } from "@/structures/Command";
import replaceAll from "@/utils/replaceAll";

export default new Command({
	name: "messages",
	description: "View the amount of messages sent by a specific user",
	options: [
		{
			name: "user",
			description: "The user to view the messages of",
			type: ApplicationCommandOptionType.User,
		},
	],
	run: async ({ client, interaction }) => {
		const user = interaction.options.getUser("user") || interaction.user;
		let userProfile = await client.db.users.findOneBy({ userId: user.id });

		if (!userProfile) {
			userProfile = await client.db.users.save({
				userId: user.id,
				messages: 0,
			});
		}

		await interaction.reply({
			embeds: [
				replaceAll(client.messages.Embeds.UserMessagesEmbed, {
					"{user-id}": user.id,
					"{user-username}": user.username,
					"{messages}": userProfile.messages,
				}),
			],
		});
	},
});
