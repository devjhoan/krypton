export interface ConfigFile {
	GeneralSettings: GeneralSettings;
	DatabaseSettings: DatabaseSettings;
}

interface GeneralSettings {
	Token: string;
}

interface DatabaseSettings {
	Type: "sqlite" | "mongodb";
	MongoUri: string;
	SQLitePath: string;
}
