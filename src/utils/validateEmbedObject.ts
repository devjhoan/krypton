import { resolveColor, type APIEmbed, type ColorResolvable } from "discord.js";

interface OwnApiEmbed extends Omit<APIEmbed, "color"> {
	color?: number | string;
}

/**
 * Validate if a embed object is valid or not
 * @param embed - The embed object to validate
 * @returns The validation result
 */
export function validateEmbedObject(embed: Partial<OwnApiEmbed>) {
	// TODO: This code need to be improved, this is just a proof of concept

	if (!embed || typeof embed !== "object") {
		return {
			valid: false,
			key: "root",
			message: "The embed object cannot be empty",
		};
	}

	if (embed.title && typeof embed.title !== "string") {
		return {
			valid: false,
			key: "title",
			message: "The title must be a string",
		};
	}

	if (embed.description && typeof embed.description !== "string") {
		return {
			valid: false,
			key: "description",
			message: "The description must be a string",
		};
	}

	if (embed.color && typeof embed.color !== "string") {
		return {
			valid: false,
			key: "color",
			message: "The color must be a valid color string",
		};
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

	if (embed.footer && typeof embed.footer !== "object") {
		return {
			valid: false,
			key: "footer",
			message: "The footer must be an object",
		};
	}

	if (embed.footer?.text && typeof embed.footer.text !== "string") {
		return {
			valid: false,
			key: "footer.text",
			message: "The footer text must be a string",
		};
	}

	if (embed.footer?.icon_url && typeof embed.footer.icon_url !== "string") {
		return {
			valid: false,
			key: "footer.icon_url",
			message: "The footer icon url must be a string",
		};
	}

	if (embed.image && typeof embed.image !== "object") {
		return {
			valid: false,
			key: "image",
			message: "The image must be an object",
		};
	}

	if (embed.image?.url && typeof embed.image.url !== "string") {
		return {
			valid: false,
			key: "image.url",
			message: "The image url must be a string",
		};
	}

	if (embed.thumbnail && typeof embed.thumbnail !== "object") {
		return {
			valid: false,
			key: "thumbnail",
			message: "The thumbnail must be an object",
		};
	}

	if (embed.thumbnail?.url && typeof embed.thumbnail.url !== "string") {
		return {
			valid: false,
			key: "thumbnail.url",
			message: "The thumbnail url must be a string",
		};
	}

	if (embed.author && typeof embed.author !== "object") {
		return {
			valid: false,
			key: "author",
			message: "The author must be an object",
		};
	}

	if (embed.author?.name && typeof embed.author.name !== "string") {
		return {
			valid: false,
			key: "author.name",
			message: "The author name must be a string",
		};
	}

	if (embed.author?.url && typeof embed.author.url !== "string") {
		return {
			valid: false,
			key: "author.url",
			message: "The author url must be a string",
		};
	}

	if (embed.author?.icon_url && typeof embed.author.icon_url !== "string") {
		return {
			valid: false,
			key: "author.icon_url",
			message: "The author icon url must be a string",
		};
	}

	return {
		valid: true,
		key: "",
		message: "The embed object is valid",
	};
}
