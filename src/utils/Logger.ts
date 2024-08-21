interface LoggerProps {
	type: "warn" | "success" | "error" | "info";
	message: string | Error;
	date?: Date;
}

class Logger {
	emojis: { [key: string]: string[] };

	constructor() {
		this.emojis = {
			warn: ["-", "\x1b[33m"],
			success: ["+", "\x1b[32m"],
			error: ["x", "\x1b[31m"],
			info: ["!", "\x1b[36m"],
		};
	}

	private logger({ type, message }: LoggerProps) {
		if (typeof message !== "string") {
			return console.error(message);
		}

		const [emoji, color] = this.emojis[type];
		console.log(`${color} ${emoji} ${message}\x1b[0m`);
	}

	public warn(args: string) {
		this.logger({
			type: "warn",
			message: args,
			date: new Date(),
		});
	}

	public success(args: string) {
		this.logger({
			type: "success",
			message: args,
			date: new Date(),
		});
	}

	public error(args: string | Error) {
		this.logger({
			type: "error",
			message: args,
			date: new Date(),
		});
	}

	public info(args: string) {
		this.logger({
			type: "info",
			message: args,
			date: new Date(),
		});
	}
}

export default Logger;
