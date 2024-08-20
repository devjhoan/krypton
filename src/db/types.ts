export type DotNotation<T> = T extends object
	? {
			[K in keyof T]: K extends string
				? T[K] extends Function
					? never
					: T[K] extends object
						? `${K}` | `${K}.${DotNotation<T[K]>}`
						: `${K}`
				: never;
		}[keyof T]
	: never;

export type ValueOf<T, P extends string> = P extends `${infer K}.${infer Rest}`
	? K extends keyof T
		? ValueOf<T[K], Rest>
		: never
	: P extends keyof T
		? T[P]
		: never;
