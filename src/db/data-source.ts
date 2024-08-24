import { DataSource, type DataSourceOptions } from "typeorm";
import { Giveaway } from "@/db/entity/Giveaway";
import { config } from "@/utils/getConfigFiles";
import { Guild } from "@/db/entity/Guild";
import { Ticket } from "./entity/Ticket";
import { User } from "@/db/entity/User";

const sqliteConfiguration: DataSourceOptions = {
	type: "sqlite",
	database: config.DatabaseSettings.SQLitePath,
};

const mongodbConfiguration: DataSourceOptions = {
	type: "mongodb",
	url: config.DatabaseSettings.MongoUri,
};

const appSourceConfiguration = {
	sqlite: sqliteConfiguration,
	mongodb: mongodbConfiguration,
};

export const AppDataSource = new DataSource({
	...appSourceConfiguration[config.DatabaseSettings.Type],
	synchronize: true,
	logging: false,
	entities: [Guild, Giveaway, User, Ticket],
});
