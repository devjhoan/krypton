import { type APIEmbed, type ColorResolvable, resolveColor } from "discord.js";
import bot from "..";

// TODO: This code need to be improved
function replaceAll(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	embed: string | APIEmbed | Array<any>,
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	replaces: { [key: string]: string | any } = {},
) {
	replaces["{color-default}"] = resolveColor(
		bot.messages.Strings.DefaultColor as ColorResolvable,
	);
	replaces["{bot-username}"] = bot?.user?.username;
	replaces["{bot-avatar}"] = bot?.user?.displayAvatarURL();
	replaces["{bot-tag}"] = bot?.user?.tag;

	let cacheEmbed = JSON.parse(JSON.stringify(embed));

	for (const items of Object.entries(replaces)) {
		const [needle, replacement] = items;
		const regExp = new RegExp(needle, "g");

		if (typeof embed === "object") {
			for (const property in embed) {
				// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
				if (!cacheEmbed.hasOwnProperty(property)) continue;

				let value = cacheEmbed[property];
				let newProperty = property;

				newProperty = property.replace(regExp, replacement);

				if (Array.isArray(value)) {
					value = replaceAll(value, replaces);
					value = Object.values(value);
				} else if (typeof value === "object") {
					value = replaceAll(value, replaces);
				} else if (typeof value === "string") {
					value = value.replaceAll(regExp, replacement);
				}

				if (
					property === "color" &&
					value !== "{color-default}" &&
					Number.isNaN(parseInt(value))
				) {
					cacheEmbed[newProperty] = resolveColor(value);
					continue;
				}

				cacheEmbed[newProperty] = value;
			}
		} else {
			cacheEmbed = cacheEmbed.replaceAll(regExp, replacement);
		}
	}

	return cacheEmbed;
}

export default replaceAll;
