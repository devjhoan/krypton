import { Events, type TextChannel } from "discord.js";
import replaceAll from "@/utils/replaceAll";
import { Event } from "@/structures/Event";
import bot from "@/index";

export default new Event(Events.GuildMemberAdd, async (member) => {
	if (member.user.bot) return;
	if (!member.guild) return;

	const guildProfile = await bot.db.guilds.findOneBy({
		guildId: member.guild.id,
	});

	try {
		await bot.db.users.save({
			userId: member.id,
			guildId: member.guild.id,
			messages: 0,
		});
	} catch (error) {
		console.error(error);
	}

	if (!guildProfile || !guildProfile?.welcomeSettings.enabled) return;
	const welcomeChannel = member.guild.channels.cache.get(
		guildProfile.welcomeSettings.channel,
	) as TextChannel;

	if (!welcomeChannel) return;
	return await welcomeChannel.send({
		embeds: [
			replaceAll(bot.messages.Embeds.UserJoinedEmbed, {
				"{user-username}": member.user.username,
				"{user-id}": member.id,
				"{user-avatar}": member.user.displayAvatarURL(),
				"{guild-name}": member.guild.name,
				"{guild-id}": member.guild.id,
				"{memberCount}": member.guild.memberCount,
				"{guild-icon}": member.guild.iconURL({ forceStatic: false }),
				"{guild-splash}": member.guild.splashURL({ forceStatic: false }),
				"{guild-banner}": member.guild.bannerURL({ forceStatic: false }),
				"{guild-description}": member.guild.description,
				"{createdTimestamp}": Math.floor(member.user.createdTimestamp / 1000),
				"{joinedTimestamp}": Math.floor(Date.now() / 1000),
			}),
		],
	});
});
