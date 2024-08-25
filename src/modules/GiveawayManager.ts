import { type TextChannel, ActionRowBuilder, ButtonBuilder } from "discord.js";
import type { Giveaway } from "@/db/entity/Giveaway";
import { TypedEmitter } from "tiny-typed-emitter";
import replaceAll from "@/utils/replaceAll";
import type Bot from "@/structures/Client";
import ms from "ms";

interface GiveawayEvents {
	giveawayEnded: (giveaway: Giveaway) => void;
}

interface CreateGiveaway {
	prize: string;
	channel: TextChannel;
	hostedBy: string;
	description: string;
	winnerCount: number;
	time: string;
	endDate: Date;
	winners?: Array<string>;
	ended?: boolean;
}

export class GiveawayManager extends TypedEmitter<GiveawayEvents> {
	private client: Bot;

	/**
	 * Creates a new giveaway manager
	 * @param client - The client
	 */
	constructor(client: Bot) {
		super();

		this.client = client;

		this.on("giveawayEnded", async (giveaway) => {
			const channel = await this.client.channels.fetch(giveaway.channelId);
			if (!channel?.isTextBased()) return;

			const message = await channel.messages.fetch(giveaway.messageId);
			if (giveaway.winners.length) {
				await channel.send({
					content: `Congratulations, ${giveaway.winners.map((id) => `<@${id}>`).join(", ")}, you won **${giveaway.prize}**!`,
				});
			}

			await message.edit(this.generateMessagePayload(giveaway));
		});
	}

	async startGiveawayInterval() {
		await this.checkGiveawayStatus();
		setInterval(this.checkGiveawayStatus.bind(this), ms("5s"));
	}

	/**
	 * Creates a new giveaway in the database
	 * @param giveaway - The giveaway to create
	 * @returns The created giveaway
	 */
	async createGiveaway(giveaway: CreateGiveaway) {
		const messagePayload = this.generateMessagePayload(giveaway);
		const message = await giveaway.channel.send(messagePayload);

		return await this.client.db.giveaways.save({
			guildId: giveaway.channel.guild.id,
			winnerCount: giveaway.winnerCount,
			description: giveaway.description,
			channelId: giveaway.channel.id,
			hostedBy: giveaway.hostedBy,
			endDate: giveaway.endDate,
			messageId: message.id,
			prize: giveaway.prize,
			startDate: new Date(),
			ended: false,
			entries: [],
			winners: [],
		});
	}

	/**
	 * Generates the message payload for a giveaway
	 * @param giveaway - The giveaway to generate the message payload for
	 * @returns A parsed payload for the message
	 */
	generateMessagePayload(giveaway: Giveaway | CreateGiveaway) {
		const embedKey = giveaway.ended ? "GiveawayEnded" : "GiveawayCreated";
		const buttonKey = giveaway.ended
			? "GiveawayEndedButton"
			: "GiveawayActiveButton";

		return {
			embeds: [
				replaceAll(this.client.messages.Embeds[embedKey], {
					"{prize}": giveaway.prize,
					"{description}": giveaway.description,
					"{winners}": giveaway.winners
						? giveaway.winners.map((w) => `<@${w}>`).join(", ")
						: giveaway.winnerCount,
					"{hostedBy}": giveaway.hostedBy,
					"{timestamp}": Math.floor(giveaway.endDate.getTime() / 1000),
				}),
			],
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setLabel(
							replaceAll(this.client.messages.Buttons[buttonKey]?.Label, {
								"{entries}": "0",
							}),
						)
						.setStyle(this.client.messages.Buttons[buttonKey]?.Style)
						.setEmoji(this.client.messages.Buttons[buttonKey]?.Emoji)
						.setDisabled(giveaway?.ended ?? false)
						.setCustomId(giveaway.ended ? "end-giveaway" : "join-giveaway"),
				),
			],
		};
	}

	/**
	 * Deletes a giveaway from the database
	 * @param giveawayId - The id of the giveaway to delete
	 * @returns The deleted giveaway
	 */
	async deleteGiveaway(giveawayId: string) {
		return await this.client.db.giveaways.delete(giveawayId);
	}

	/**
	 * Gets a giveaway from the database by its messageId and channelId
	 * @returns The giveaways fetched from the database
	 */
	async getGiveaway(messageId: string, channelId: string) {
		return await this.client.db.giveaways.findOneBy({ messageId, channelId });
	}

	/**
	 * Edit a giveaway in the database by its id
	 * @param giveawayId - The id of the giveaway to edit
	 * @returns The edited giveaway
	 */
	async getGiveawayById(giveawayId: string) {
		return await this.client.db.giveaways.findOneBy({ giveawayId });
	}

	/**
	 * Gets all giveaways from the database
	 * @returns The giveaways fetched from the database
	 */
	async getGiveaways() {
		return await this.client.db.giveaways.find();
	}

	/**
	 * Registers a user entry to a giveaway
	 * @param giveawayId - The id of the giveaway to register the user entry
	 * @param userId - The id of the user to register
	 * @returns The updated giveaway
	 */
	async registerUserEntry(giveawayId: string, userId: string) {
		const giveaway = await this.getGiveawayById(giveawayId);
		if (!giveaway) throw new Error("Giveaway not found");

		return await this.client.db.giveaways.update(giveawayId, {
			entries: [...new Set([...giveaway.entries, userId])],
		});
	}

	/**
	 * Unregisters a user entry from a giveaway
	 * @param giveawayId - The id of the giveaway to unregister the user entry
	 * @param userId - The id of the user to unregister
	 * @returns The updated giveaway
	 */
	async unregisterUserEntry(giveawayId: string, userId: string) {
		const giveaway = await this.getGiveawayById(giveawayId);
		if (!giveaway) throw new Error("Giveaway not found");

		return await this.client.db.giveaways.update(giveawayId, {
			entries: giveaway.entries.filter((entry) => entry !== userId),
		});
	}

	/**
	 * This function checks if any of the giveaways have ended
	 * and if they have it emits the `giveawayEnded` event
	 */
	private async checkGiveawayStatus() {
		const giveaways = await this.client.db.giveaways.find({
			where: { ended: false },
		});

		for (const giveaway of giveaways) {
			if (giveaway.ended) {
				continue;
			}

			if (giveaway.endDate < new Date()) {
				giveaway.winners = this.getWinnersForGiveaway(giveaway);
				giveaway.ended = true;

				await this.client.db.giveaways.save(giveaway);
				this.emit("giveawayEnded", giveaway);
			}
		}
	}

	/**
	 * Gets the winners of a giveaway
	 * @param giveaway - The giveaway to get the winners of
	 * @returns The winners of the giveaway
	 */
	private getWinnersForGiveaway(giveaway: Giveaway): Array<string> {
		const winners: Array<string> = [];
		const entryCount = giveaway.entries.length;
		const winnerCount = Math.min(giveaway.winnerCount, entryCount);

		for (let i = 0; i < winnerCount; i++) {
			let winner: string;
			do {
				winner = giveaway.entries[Math.floor(Math.random() * entryCount)];
			} while (!winner || winners.includes(winner));

			winners.push(winner);
		}

		return winners;
	}
}
