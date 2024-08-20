import { BotSettings } from "@/modules/BotSettings";
import { Command } from "@/structures/Command";

export default new Command({
	name: "config",
	description: "Configure your bot settings using a menu",
	run: async ({ client, interaction }) => {
		const settings = new BotSettings(client);
		await settings.run(interaction);
	},
});
