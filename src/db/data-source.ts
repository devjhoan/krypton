import { Giveaway } from "@/db/entity/Giveaway";
import { config } from "@/utils/getConfigFiles";
import { Guild } from "@/db/entity/Guild";
import { User } from "@/db/entity/User";
import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
	type: config.DatabaseSettings.Type,
	database: config.DatabaseSettings.SQLitePath,
	url: config.DatabaseSettings.MongoUri,
	synchronize: true,
	logging: false,
	entities: [Guild, Giveaway, User],
});
