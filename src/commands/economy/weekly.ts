import { Command } from "@/structures/Command";
import replaceAll from "@/utils/replaceAll";

export default new Command({
	name: "weekly",
	description: "Claim your weekly reward",
	run: async ({ client, interaction }) => {
		const userId = interaction.user.id;
		const guildId = interaction.guild.id;

		const userProfile = await client.dbHelper.users.get(userId, guildId);
		const guildProfile = await client.dbHelper.guilds.get(guildId);

		const weeklyReward = guildProfile.economySettings.weeklyReward;
		await client.dbHelper.users.update(userId, guildId, {
			walletMoney: userProfile.walletMoney + weeklyReward,
		});

		return await interaction.reply({
			embeds: [
				replaceAll(client.messages.Embeds.EconomyWeeklyEmbed, {
					"{user-id}": userId,
					"{user-username}": interaction.user.username,
					"{user-avatar}": interaction.user.displayAvatarURL(),
					"{money}": guildProfile.economySettings.coinSymbol,
					"{amount}": weeklyReward,
				}),
			],
		});
	},
});
