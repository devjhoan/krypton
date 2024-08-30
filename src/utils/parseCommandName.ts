export function commandNameToPascalCase(name: string) {
	return name
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join("");
}

export function commandNameToSnakeCase(name: string) {
	return name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}
