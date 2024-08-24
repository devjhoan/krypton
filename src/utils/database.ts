import { config } from "./getConfigFiles";

import {
	ObjectIdColumn,
	PrimaryGeneratedColumn,
	type ColumnType,
} from "typeorm";

export function PrimaryColumn() {
	return config.DatabaseSettings.Type === "mongodb"
		? ObjectIdColumn()
		: PrimaryGeneratedColumn("uuid");
}

export function defaultJsonify<T extends object | null>(value?: T) {
	if (config.DatabaseSettings.Type === "sqlite") {
		return () => `('${JSON.stringify(value)}')`;
	}

	return value;
}

export function jsonType(): ColumnType {
	if (config.DatabaseSettings.Type === "mongodb") {
		return "jsonb";
	}

	return "json";
}
