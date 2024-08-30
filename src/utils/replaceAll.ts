import {
	type APIEmbed,
	type ColorResolvable,
	type InteractionReplyOptions,
	resolveColor,
} from "discord.js";
import bot from "..";

function replaceAll(
	embed: string | APIEmbed | InteractionReplyOptions | Array<unknown>,
	replaces: Record<string, string | number> = {},
): typeof embed {
	const defaultReplaces = {
		"{color-default}": resolveColor(
			bot.messages.Strings.DefaultColor as ColorResolvable,
		),
		"{bot-username}": bot?.user?.username ?? "",
		"{bot-avatar}": bot?.user?.displayAvatarURL() ?? "",
		"{bot-tag}": bot?.user?.tag ?? "",
	};

	const allReplaces = { ...defaultReplaces, ...replaces };
	const replaceString = (str: string): string => {
		return Object.entries(allReplaces).reduce(
			(acc, [needle, replacement]) =>
				acc.replace(new RegExp(needle, "g"), String(replacement)),
			str,
		);
	};

	const processValue = (value: unknown): unknown => {
		if (Array.isArray(value)) {
			return value.map(processValue);
		}
		if (typeof value === "object" && value !== null) {
			return replaceAll(value as Record<string, unknown>, allReplaces);
		}
		if (typeof value === "string") {
			return replaceString(value);
		}
		return value;
	};

	if (typeof embed === "string") {
		return replaceString(embed);
	}

	if (typeof embed === "object" && embed !== null) {
		const result: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(embed)) {
			const newKey = replaceString(key);
			let newValue = processValue(value);

			if (
				newKey === "color" &&
				typeof newValue === "string" &&
				newValue !== "{color-default}"
			) {
				newValue = resolveColor(newValue as ColorResolvable);
			}

			result[newKey] = newValue;
		}

		return result as typeof embed;
	}

	return embed;
}

export default replaceAll;
