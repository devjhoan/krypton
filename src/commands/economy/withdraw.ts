import { Command } from "@/structures/Command";
import replaceAll from "@/utils/replaceAll";
import { ApplicationCommandOptionType } from "discord.js";

export default new Command({
	name: "withdraw",
	description: "Withdraw money from your bank",
	options: [
		{
			name: "amount",
			description: "The amount of money to withdraw",
			type: ApplicationCommandOptionType.String,
			required: true,
		},
	],
	run: async ({ client, interaction }) => {
		const userId = interaction.user.id;
		const guildId = interaction.guild.id;

		const userProfile = await client.dbHelper.users.get(userId, guildId);
		const guildProfile = await client.dbHelper.guilds.get(guildId);

		const withdrawAmount = interaction.options.getString("amount", true);
		const finalWithdrawAmount =
			withdrawAmount === "all" ? userProfile.bankMoney : Number(withdrawAmount);

		if (finalWithdrawAmount > userProfile.bankMoney) {
			return await interaction.reply({
				embeds: [
					replaceAll(client.messages.Embeds.EconomyNotEnoughMoneyEmbed, {
						"{user-id}": interaction.user.id,
						"{user-username}": interaction.user.username,
						"{user-avatar}": interaction.user.displayAvatarURL(),
						"{money}": guildProfile.economySettings.coinSymbol,
					}),
				],
			});
		}

		await client.dbHelper.users.update(userId, guildId, {
			bankMoney: userProfile.bankMoney - finalWithdrawAmount,
			walletMoney: userProfile.walletMoney + finalWithdrawAmount,
		});

		return await interaction.reply({
			embeds: [
				replaceAll(client.messages.Embeds.EconomyWithdrawEmbed, {
					"{user-id}": interaction.user.id,
					"{user-username}": interaction.user.username,
					"{user-avatar}": interaction.user.displayAvatarURL(),
					"{money}": guildProfile.economySettings.coinSymbol,
					"{amount}": finalWithdrawAmount,
				}),
			],
		});
	},
});
