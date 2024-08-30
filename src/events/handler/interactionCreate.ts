import { Events, type PermissionResolvable } from "discord.js";
import type { CommandType, ExtendedInteraction } from "@/types/Command";
import { Event } from "@/structures/Event";
import bot from "@/index";

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

	console.log(`${command.name}: ${command.permission}`);
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
