import { Command } from "@/structures/Command";
import replaceAll from "@/utils/replaceAll";

export default new Command({
	name: "work",
	description: "Work to earn money",
	run: async ({ client, interaction }) => {
		const userId = interaction.user.id;
		const guildId = interaction.guild.id;

		const userProfile = await client.dbHelper.users.get(userId, guildId);
		const guildProfile = await client.dbHelper.guilds.get(guildId);

		const workEarnings = Math.floor(
			Math.random() *
				(guildProfile.economySettings.maxWorkEarnings -
					guildProfile.economySettings.minWorkEarnings) +
				guildProfile.economySettings.minWorkEarnings,
		);

		await client.dbHelper.users.update(userId, guildId, {
			walletMoney: userProfile.walletMoney + workEarnings,
		});

		return await interaction.reply({
			embeds: [
				replaceAll(client.messages.Embeds.EconomyWorkEmbed, {
					"{user-id}": interaction.user.id,
					"{user-username}": interaction.user.username,
					"{user-avatar}": interaction.user.displayAvatarURL(),
					"{total-money}": userProfile.walletMoney + workEarnings,
					"{money}": guildProfile.economySettings.coinSymbol,
					"{amount}": workEarnings,
				}),
			],
		});
	},
});
