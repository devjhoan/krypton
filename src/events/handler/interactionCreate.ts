import type { ExtendedInteraction } from "@/types/Command";
import { Event } from "@/structures/Event";
import { Events } from "discord.js";
import bot from "@/index";

export default new Event(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	const command = bot.commands.get(interaction.commandName);
	if (!command) return;

	try {
		await command.run({
			client: bot,
			interaction: interaction as ExtendedInteraction,
		});
	} catch (error) {
		console.error(error);

		await interaction[
			interaction.replied || interaction.deferred ? "editReply" : "reply"
		]({
			content: "There was an error while executing this command!",
			ephemeral: true,
		});
	}
});
