import { Command } from "@/structures/Command";
import replaceAll from "@/utils/replaceAll";

export default new Command({
	name: "daily",
	description: "Claim your daily reward",
	run: async ({ client, interaction }) => {
		const userId = interaction.user.id;
		const guildId = interaction.guild.id;

		const userProfile = await client.dbHelper.users.get(userId, guildId);
		const guildProfile = await client.dbHelper.guilds.get(guildId);

		const dailyReward = guildProfile.economySettings.dailyReward;
		await client.dbHelper.users.update(userId, guildId, {
			walletMoney: userProfile.walletMoney + dailyReward,
		});

		return await interaction.reply({
			embeds: [
				replaceAll(client.messages.Embeds.EconomyDailyEmbed, {
					"{user-id}": interaction.user.id,
					"{user-username}": interaction.user.username,
					"{user-avatar}": interaction.user.displayAvatarURL(),
					"{money}": guildProfile.economySettings.coinSymbol,
					"{amount}": dailyReward,
				}),
			],
		});
	},
});
