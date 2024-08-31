import { AppDataSource } from "@/db/data-source";
import { Giveaway } from "@/db/entity/Giveaway";
import { Ticket } from "@/db/entity/Ticket";
import { Guild } from "@/db/entity/Guild";
import { User } from "@/db/entity/User";

const giveaways = AppDataSource.getRepository(Giveaway);
const tickets = AppDataSource.getRepository(Ticket);
const guilds = AppDataSource.getRepository(Guild);
const users = AppDataSource.getRepository(User);

class UserHelper {
	async get(userId: string, guildId: string) {
		let userProfile = await users.findOneBy({ userId, guildId });
		if (!userProfile) {
			userProfile = await users.save({
				userId,
				guildId,
				walletMoney: 0,
				bankMoney: 0,
			});
		}
		return userProfile;
	}

	async create(userData: Partial<User>) {
		return await users.save(userData);
	}

	async update(userId: string, guildId: string, updateData: Partial<User>) {
		return await users.update({ userId, guildId }, updateData);
	}
}

class GuildHelper {
	async get(guildId: string) {
		let guildProfile = await guilds.findOneBy({ guildId });
		if (!guildProfile) {
			guildProfile = await guilds.save({ guildId });
		}
		return guildProfile;
	}

	async create(guildData: Partial<Guild>) {
		return await guilds.save(guildData);
	}

	async update(guildId: string, updateData: Partial<Guild>) {
		return await guilds.update({ guildId }, updateData);
	}
}

class GiveawayHelper {
	async get(giveawayId: string) {
		return await giveaways.findOneBy({ giveawayId });
	}

	async create(giveawayData: Partial<Giveaway>) {
		return await giveaways.save(giveawayData);
	}

	async update(giveawayId: string, updateData: Partial<Giveaway>) {
		return await giveaways.update({ giveawayId }, updateData);
	}
}

class TicketHelper {
	async get(ticketId: string) {
		return await tickets.findOneBy({ ticketId });
	}

	async create(ticketData: Partial<Ticket>) {
		return await tickets.save(ticketData);
	}

	async update(ticketId: string, updateData: Partial<Ticket>) {
		return await tickets.update({ ticketId }, updateData);
	}
}

export class DatabaseHelper {
	public users: UserHelper;
	public guilds: GuildHelper;
	public giveaways: GiveawayHelper;
	public tickets: TicketHelper;

	constructor() {
		this.users = new UserHelper();
		this.guilds = new GuildHelper();
		this.giveaways = new GiveawayHelper();
		this.tickets = new TicketHelper();
	}
}
