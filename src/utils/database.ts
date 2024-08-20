import { ObjectIdColumn, PrimaryColumn as SqliteColumn } from "typeorm";
import { config } from "./getConfigFiles";

export function PrimaryColumn() {
	return config.DatabaseSettings.Type === "mongodb"
		? ObjectIdColumn()
		: SqliteColumn();
}
