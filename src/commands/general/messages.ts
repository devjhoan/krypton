import { ApplicationCommandOptionType } from "discord.js";
import { Command } from "../../structures/Command";

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
	},
});
