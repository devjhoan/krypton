import { ApplicationCommandOptionType } from "discord.js";
import { Command } from "@/structures/Command";
import replaceAll from "@/utils/replaceAll";

export default new Command({
	name: "deposit",
	description: "Deposit money into your bank",
	options: [
		{
			name: "amount",
			description: "The amount of money to deposit",
			type: ApplicationCommandOptionType.String,
			required: true,
		},
	],
	run: async ({ client, interaction }) => {
		const userId = interaction.user.id;
		const guildId = interaction.guild.id;

		const userProfile = await client.dbHelper.users.get(userId, guildId);
		const guildProfile = await client.dbHelper.guilds.get(guildId);

		const depositAmount = interaction.options.getString("amount", true);
		const finalDepositAmount =
			depositAmount === "all" ? userProfile.walletMoney : Number(depositAmount);

		if (finalDepositAmount > userProfile.walletMoney) {
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
			bankMoney: userProfile.bankMoney + finalDepositAmount,
			walletMoney: userProfile.walletMoney - finalDepositAmount,
		});

		return await interaction.reply({
			embeds: [
				replaceAll(client.messages.Embeds.EconomyDepositEmbed, {
					"{user-id}": interaction.user.id,
					"{user-username}": interaction.user.username,
					"{user-avatar}": interaction.user.displayAvatarURL(),
					"{money}": guildProfile.economySettings.coinSymbol,
					"{amount}": finalDepositAmount,
				}),
			],
		});
	},
});
