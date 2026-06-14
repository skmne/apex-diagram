function getApexClassKey(namespace?: string, name?: string): string | undefined {
	return namespace ? `${namespace}.${name}` : name;
}

export { getApexClassKey };
