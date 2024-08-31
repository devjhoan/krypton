import type { CommandType, ExtendedInteraction } from "@/types/Command";
import { Events, type PermissionResolvable } from "discord.js";
import { Event } from "@/structures/Event";
import bot from "@/index";
import ms from "ms";
import replaceAll from "@/utils/replaceAll";

export default new Event(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	const command = bot.commands.get(interaction.commandName);
	if (!command)
		return bot.logger.error(`Command ${interaction.commandName} not found`);

	if (!hasPermission(interaction as ExtendedInteraction, command)) {
		return interaction.reply({
			content: "No tienes permiso para usar este comando.",
			ephemeral: true,
		});
	}

	if (hasCooldown(interaction as ExtendedInteraction, command)) return;

	try {
		await command.run({
			client: bot,
			interaction: interaction as ExtendedInteraction,
		});
	} catch (error) {
		bot.handleDiscordError(error as Error);

		await interaction[
			interaction.replied || interaction.deferred ? "editReply" : "reply"
		]({
			content: "There was an error while executing this command!",
			ephemeral: true,
		});
	}
});

function hasPermission(interaction: ExtendedInteraction, command: CommandType) {
	if (!command.permission) return false;
	const member = interaction.member;

	if (command.permission.includes("everyone")) return true;
	return command.permission.some((permission) => {
		return (
			member.roles.cache.some(
				(r) => r.id === permission || r.name === permission,
			) ||
			member.user.id === permission ||
			member.user.username === permission ||
			member.permissions.has(permission as PermissionResolvable)
		);
	});
}

function hasCooldown(interaction: ExtendedInteraction, command: CommandType) {
	if (!command.cooldown) return false;

	const cooldownQuery = `${interaction.user.id}-${command.name}`;
	const userCooldown = bot.cooldowns.get(cooldownQuery) || 0;
	const cooldownTime = command.cooldown ? ms(command.cooldown) : 0;
	const timeLeft = userCooldown - Date.now();

	if (timeLeft > 0) {
		return interaction.reply({
			ephemeral: true,
			embeds: [
				replaceAll(bot.messages.Embeds.UserInCooldownEmbed, {
					"{user-username}": interaction.user.username,
					"{user-avatar}": interaction.user.displayAvatarURL(),
					"{time}": `${Math.floor(userCooldown / 1000)}`,
				}),
			],
		});
	}

	if (cooldownTime > 0) {
		bot.cooldowns.set(cooldownQuery, Date.now() + cooldownTime);

		setTimeout(() => {
			bot.cooldowns.delete(cooldownQuery);
		}, cooldownTime);
	}

	return false;
}
