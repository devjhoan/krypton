import { Event } from "@/structures/Event";
import { Events } from "discord.js";
import bot from "@/index";

export default new Event(Events.MessageCreate, async (message) => {
	if (message.author.bot) return;
	if (!message.guild) return;

	const userProfile = await bot.db.users.findOneBy({
		userId: message.author.id,
	});

	if (!userProfile) {
		return await bot.db.users.save({
			userId: message.author.id,
			guildId: message.guild.id,
			messages: 1,
		});
	}

	return await bot.db.users.update(userProfile, {
		messages: userProfile.messages + 1,
	});
});
