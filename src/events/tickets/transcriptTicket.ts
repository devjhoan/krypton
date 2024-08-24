import { createTranscript } from "discord-html-transcripts";
import { type TextChannel, Events } from "discord.js";
import replaceAll from "@/utils/replaceAll";
import { Event } from "@/structures/Event";
import bot from "@/index";

export default new Event(Events.InteractionCreate, async (interaction) => {
	if (
		!interaction.guild ||
		!interaction.isButton() ||
		interaction.customId !== "tkt-transcript"
	)
		return;

	const ticket = await bot.db.tickets.findOneBy({
		channelId: interaction.channelId,
		guildId: interaction.guild.id,
	});

	if (!ticket) return;

	const ticketChannel = interaction.channel as TextChannel;
	const ticketOwner = await bot.users.fetch(ticket.userId);

	const guildProfile = await bot.db.guilds.findOneBy({
		guildId: interaction.guild.id,
	});

	if (!guildProfile || !guildProfile?.ticketSettings) return;

	const ticketSettings = guildProfile.ticketSettings;
	const transcriptChannel = interaction.guild.channels.cache.get(
		ticketSettings.transcriptChannel,
	) as TextChannel;

	if (!transcriptChannel) return;
	const transcriptAttachment = await createTranscript(ticketChannel, {
		saveImages: ticketSettings.saveImagesInTranscript,
		limit: -1,
		poweredBy: false,
	});

	const transcriptPayload = (url: string) => ({
		embeds: [
			replaceAll(bot.messages.Embeds.TranscriptEmbed, {
				"{owner-id}": ticketOwner.id,
				"{owner-username}": ticketOwner.username,
				"{owner-avatar}": ticketOwner.displayAvatarURL(),
				"{ticket-name}": ticketChannel.name,
				"{category-name}":
					guildProfile.ticketCategories.find((t) => t.id === ticket.categoryId)
						?.name || "Unknown",
				"{staff-tag}": interaction.user.username,
				"{staff-id}": interaction.user.id,
				"{transcript-url}": url,
			}),
		],
	});

	if (
		ticketSettings.transcriptType === "channel" ||
		ticketSettings.transcriptType === "both"
	) {
		const message = await transcriptChannel
			.send({
				files: [transcriptAttachment],
			})
			.catch(null);

		const embed = transcriptPayload(
			message.attachments.first()?.url || "Unknown",
		);

		await message.edit(embed).catch(null);
		await ticketOwner.send(embed).catch(null);
	} else if (ticketSettings.transcriptType === "user") {
		const message = await ticketOwner
			.send({
				files: [transcriptAttachment],
			})
			.catch(null);

		const embed = transcriptPayload(
			message.attachments.first()?.url || "Unknown",
		);

		await message.edit(embed).catch(null);
	}

	await interaction.reply({
		embeds: [replaceAll(bot.messages.Embeds.TranscriptCreatedEmbed)],
	});
});
