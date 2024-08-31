import { ApplicationCommandOptionType } from "discord.js";
import { Command } from "@/structures/Command";
import replaceAll from "@/utils/replaceAll";

export default new Command({
	name: "balance",
	description: "View the balance of a user",
	options: [
		{
			name: "user",
			description: "The user to view the balance of",
			type: ApplicationCommandOptionType.User,
			required: false,
		},
	],
	run: async ({ client, interaction }) => {
		const user = interaction.options.getUser("user") || interaction.user;

		const userId = user.id;
		const guildId = interaction.guild.id;

		const userProfile = await client.dbHelper.users.get(userId, guildId);
		const guildProfile = await client.dbHelper.guilds.get(guildId);

		return await interaction.reply({
			embeds: [
				replaceAll(client.messages.Embeds.UserBalanceEmbed, {
					"{user-id}": userId,
					"{user-username}": user.username,
					"{user-avatar}": user.displayAvatarURL(),
					"{wallet-money}": userProfile.walletMoney,
					"{bank-money}": userProfile.bankMoney,
					"{total-money}": userProfile.walletMoney + userProfile.bankMoney,
					"{money}": guildProfile.economySettings.coinSymbol,
				}),
			],
		});
	},
});
