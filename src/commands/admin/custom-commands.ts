import { commandNameToPascalCase } from "@/utils/parseCommandName";
import { EmbedSetup, QuestionType } from "@/modules/EmbedSetup";
import { readFile, writeFile } from "node:fs/promises";
import type { CommandsFile } from "@/types/Command";
import { Command } from "@/structures/Command";
import { load, dump } from "js-yaml";

import {
	ApplicationCommandOptionType,
	type ColorResolvable,
	EmbedBuilder,
	resolveColor,
} from "discord.js";

const selectCommandToEdit = (commands: CommandsFile) =>
	[
		{
			label: "Command To Edit",
			emoji: "🎠",
			key: "name",
			type: QuestionType.Select,
			selects: Object.entries(commands.CustomCommands).map(
				([name, command]) => ({
					label: name,
					value: name,
					description: command.Description,
					emoji: "📃",
				}),
			),
		},
	] as const;

export default new Command({
	name: "custom-commands",
	description: "Manage custom commands",
	options: [
		{
			name: "add",
			description: "Add a custom command",
			type: ApplicationCommandOptionType.Subcommand,
		},
		{
			name: "remove",
			description: "Remove a custom command",
			type: ApplicationCommandOptionType.Subcommand,
		},
		{
			name: "edit",
			description: "Edit a custom command",
			type: ApplicationCommandOptionType.Subcommand,
		},
		{
			name: "list",
			description: "List all custom commands",
			type: ApplicationCommandOptionType.Subcommand,
		},
	],
	run: async ({ client, interaction }) => {
		const subCommand = interaction.options.getSubcommand();
		const commands = load(
			await readFile("config/commands.yml", "utf-8"),
		) as CommandsFile;

		if (subCommand === "add") {
			const setup = new EmbedSetup({
				client,
				title: "Add Custom Command",
				description: "Add a custom command to the bot",
				questions: [
					{
						label: "Command Name",
						emoji: "🔰",
						key: "name",
						type: QuestionType.Text,
					},
					{
						label: "Command Description",
						emoji: "📝",
						key: "description",
						type: QuestionType.Text,
					},
					{
						label: "Command Response",
						emoji: "💬",
						key: "response",
						type: QuestionType.SubQuestion,
						questions: [
							{
								label: "Embed Title",
								emoji: "🔰",
								key: "title",
								type: QuestionType.Text,
							},
							{
								label: "Embed Color",
								emoji: "🎨",
								key: "color",
								type: QuestionType.Text,
							},
							{
								label: "Embed Description",
								emoji: "📝",
								key: "description",
								type: QuestionType.Text,
							},
						],
					},
					{
						label: "Command Permissions",
						emoji: "🔐",
						key: "permissions",
						type: QuestionType.Roles,
					},
					{
						label: "Command Cooldown",
						emoji: "⏱️",
						key: "cooldown",
						type: QuestionType.Text,
					},
					{
						label: "Command Enabled",
						emoji: "🔄",
						key: "enabled",
						type: QuestionType.Boolean,
					},
				] as const,
				value: {
					enabled: true,
				},
			});

			const commandPayload = await setup.run(interaction);
			if (!commandPayload) return;

			if (client.commands.get(commandPayload.name)) {
				return await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setTitle("Error")
							.setDescription("A command with this name already exists"),
					],
				});
			}

			const embedPayload = {
				...commandPayload.response,
				name: commandNameToPascalCase(commandPayload.name),
				color: resolveColor(commandPayload.response.color as ColorResolvable),
			};

			commands.CustomCommands[commandPayload.name] = {
				Enabled: commandPayload.enabled,
				Description: commandPayload.description,
				Permissions: commandPayload.permissions,
				Cooldown: commandPayload.cooldown,
				Response: {
					embeds: [embedPayload],
				},
			};

			await writeFile(
				"config/commands.yml",
				dump(commands, { forceQuotes: true, indent: 2, quotingType: '"' }),
			);
			return await interaction.editReply({
				components: [],
				embeds: [
					new EmbedBuilder()
						.setTitle(
							`The custom command "${commandPayload.name}" has been created successfully!`,
						)
						.setColor(client.messages.Strings.DefaultColor as ColorResolvable),
				],
			});
		}

		if (subCommand === "remove") {
			const askCommandToEdit = new EmbedSetup({
				client,
				title: "Select a command to edit",
				description:
					"Use the selector below to select the command you want to edit, you can always create a new command by using the `/custom-commands add` command.",
				questions: selectCommandToEdit(commands),
			});

			const selectedCommand = await askCommandToEdit.run(interaction);
			if (!selectedCommand) return;

			delete commands.CustomCommands[selectedCommand.name];
			await writeFile(
				"config/commands.yml",
				dump(commands, { forceQuotes: true, indent: 2, quotingType: '"' }),
			);

			return await interaction.editReply({
				components: [],
				embeds: [
					new EmbedBuilder()
						.setTitle(
							`The custom command "${selectedCommand.name}" has been removed successfully!`,
						)
						.setColor(client.messages.Strings.DefaultColor as ColorResolvable),
				],
			});
		}

		if (subCommand === "edit") {
			const askCommandToEdit = new EmbedSetup({
				client,
				title: "Select a command to edit",
				description:
					"Use the selector below to select the command you want to edit, you can always create a new command by using the `/custom-commands add` command.",
				questions: selectCommandToEdit(commands),
			});

			const selectedCommand = await askCommandToEdit.run(interaction);
			if (!selectedCommand) return;

			const command = commands.CustomCommands[selectedCommand.name];

			const setup = new EmbedSetup({
				client,
				title: "Edit Custom Command",
				description: "Edit a custom command",
				questions: [
					{
						label: "Command Name",
						emoji: "🔰",
						key: "name",
						type: QuestionType.Text,
					},
					{
						label: "Command Description",
						emoji: "📝",
						key: "description",
						type: QuestionType.Text,
					},
					{
						label: "Command Response",
						emoji: "💬",
						key: "response",
						type: QuestionType.SubQuestion,
						readonly: true,
						questions: [
							{
								label: "Embed Title",
								emoji: "🔰",
								key: "title",
								type: QuestionType.Text,
							},
							{
								label: "Embed Color",
								emoji: "🎨",
								key: "color",
								type: QuestionType.Text,
							},
							{
								label: "Embed Description",
								emoji: "📝",
								key: "description",
								type: QuestionType.Text,
							},
						],
					},
					{
						label: "Command Permissions",
						emoji: "🔐",
						key: "permissions",
						type: QuestionType.Roles,
					},
					{
						label: "Command Cooldown",
						emoji: "⏱️",
						key: "cooldown",
						type: QuestionType.Text,
					},
					{
						label: "Command Enabled",
						emoji: "🔄",
						key: "enabled",
						type: QuestionType.Boolean,
					},
				] as const,
				value: {
					name: selectedCommand.name,
					description: command.Description,
					cooldown: command.Cooldown,
					enabled: command.Enabled,
					permissions: command.Permissions,
					// biome-ignore lint/suspicious/noExplicitAny: <explanation>
					response: command?.Response as any,
				},
				editReply: true,
			});

			const commandPayload = await setup.run(interaction);
			if (!commandPayload) return;

			commands.CustomCommands[commandPayload.name] = {
				Enabled: commandPayload.enabled,
				Description: commandPayload.description,
				Permissions: commandPayload.permissions,
				Cooldown: commandPayload.cooldown,
				Response: command.Response,
			};

			await writeFile(
				"config/commands.yml",
				dump(commands, { forceQuotes: true, indent: 2, quotingType: '"' }),
			);

			return await interaction.editReply({
				components: [],
				embeds: [
					new EmbedBuilder()
						.setTitle(
							`The custom command "${commandPayload.name}" has been edited successfully!`,
						)
						.setColor(client.messages.Strings.DefaultColor as ColorResolvable),
				],
			});
		}

		if (subCommand === "list") {
			const embed = new EmbedBuilder()
				.setTitle(`${client.user.username}'s Custom Commands`)
				.setColor(client.messages.Strings.DefaultColor as ColorResolvable)
				.setDescription(
					Object.entries(commands.CustomCommands)
						.map(
							([name, command]) =>
								`${command.Enabled ? "✅" : "❌"} \`${name}\`
							> 📰 ${command.Description}
							> ⏰ ${command.Cooldown ?? "No cooldown"}
							 `,
						)
						.join("\n"),
				);

			return await interaction.reply({
				embeds: [embed],
			});
		}
	},
});
