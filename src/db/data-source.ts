import { Giveaway } from "@/db/entity/Giveaway";
import { Guild } from "@/db/entity/Guild";
import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
	type: "sqlite",
	database: "krypton.db",
	synchronize: true,
	logging: false,
	entities: [Guild, Giveaway],
});
