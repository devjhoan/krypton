import {
	type APIEmbed,
	type ColorResolvable,
	type InteractionReplyOptions,
	resolveColor,
} from "discord.js";
import bot from "..";

function replaceAll<
	T extends string | APIEmbed | InteractionReplyOptions | Array<unknown>,
>(embed: T, replaces: Record<string, string | number> = {}): T {
	const defaultColor = resolveColor(
		bot.messages.Strings.DefaultColor as ColorResolvable,
	);

	const defaultReplaces = {
		"{color-default}": defaultColor,
		"{bot-username}": bot.user.username,
		"{bot-avatar}": bot.user.displayAvatarURL(),
		"{bot-tag}": bot.user.tag,
	};

	const allReplaces = { ...defaultReplaces, ...replaces };

	if (typeof embed === "string") {
		return replaceString(embed, allReplaces) as T;
	}

	if (typeof embed === "object" && embed !== null) {
		const result: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(embed)) {
			const newValue = processValue(key, value, allReplaces);
			result[key] = newValue;
		}

		return result as T;
	}

	return embed;
}

const replaceString = (
	string: string,
	allReplaces: Record<string, string | number>,
): string => {
	return Object.entries(allReplaces).reduce(
		(acc, [needle, replacement]) =>
			acc.replace(new RegExp(needle, "g"), String(replacement)),
		string,
	);
};

const processValue = (
	key: string,
	value: unknown,
	allReplaces: Record<string, string | number>,
): unknown => {
	if (Array.isArray(value)) {
		return value.map((item) => processValue(key, item, allReplaces));
	}

	if (typeof value === "object" && value !== null) {
		return replaceAll(value as Record<string, unknown>, allReplaces);
	}

	if (
		key === "color" &&
		typeof value === "string" &&
		value !== "{color-default}"
	) {
		return resolveColor(value as ColorResolvable);
	}

	if (typeof value === "string") {
		return replaceString(value, allReplaces);
	}

	return value;
};

export default replaceAll;
