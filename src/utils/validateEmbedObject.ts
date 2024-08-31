import { resolveColor, type APIEmbed, type ColorResolvable } from "discord.js";

interface OwnApiEmbed extends Omit<APIEmbed, "color"> {
	color?: number | string;
}

const isString = (value: unknown) => typeof value === "string";
const isObject = (value: unknown) => value && typeof value === "object";

/**
 * Validate if an embed object is valid or not
 * @param embed - The embed object to validate
 * @returns The validation result
 */
export function validateEmbedObject(embed: Partial<OwnApiEmbed>) {
	if (!embed || typeof embed !== "object") {
		return {
			valid: false,
			key: "root",
			message: "The embed object cannot be empty",
		};
	}

	const validations = [
		{
			key: "title",
			value: embed.title,
			typeCheck: isString,
			message: "The title must be a string",
		},
		{
			key: "description",
			value: embed.description,
			typeCheck: isString,
			message: "The description must be a string",
		},
		{
			key: "color",
			value: embed.color,
			typeCheck: isString,
			message: "The color must be a valid color string",
		},
		{
			key: "footer",
			value: embed.footer,
			typeCheck: isObject,
			message: "The footer must be an object",
		},
		{
			key: "footer.text",
			value: embed.footer?.text,
			typeCheck: isString,
			message: "The footer text must be a string",
		},
		{
			key: "footer.icon_url",
			value: embed.footer?.icon_url,
			typeCheck: isString,
			message: "The footer icon url must be a string",
		},
		{
			key: "image",
			value: embed.image,
			typeCheck: isObject,
			message: "The image must be an object",
		},
		{
			key: "image.url",
			value: embed.image?.url,
			typeCheck: isString,
			message: "The image url must be a string",
		},
		{
			key: "thumbnail",
			value: embed.thumbnail,
			typeCheck: isObject,
			message: "The thumbnail must be an object",
		},
		{
			key: "thumbnail.url",
			value: embed.thumbnail?.url,
			typeCheck: isString,
			message: "The thumbnail url must be a string",
		},
		{
			key: "author",
			value: embed.author,
			typeCheck: isObject,
			message: "The author must be an object",
		},
		{
			key: "author.name",
			value: embed.author?.name,
			typeCheck: isString,
			message: "The author name must be a string",
		},
		{
			key: "author.url",
			value: embed.author?.url,
			typeCheck: isString,
			message: "The author url must be a string",
		},
		{
			key: "author.icon_url",
			value: embed.author?.icon_url,
			typeCheck: isString,
			message: "The author icon url must be a string",
		},
	];

	for (const { key, value, typeCheck, message } of validations) {
		if (value !== undefined && !typeCheck(value)) {
			return { valid: false, key, message };
		}
	}

	if (
		embed.color &&
		embed.color !== "{color-default}" &&
		resolveColor(embed.color as ColorResolvable) === null
	) {
		return {
			valid: false,
			key: "color",
			message: "The color must be a valid color string",
		};
	}

	return { valid: true, key: "", message: "The embed object is valid" };
}
