export type ApexClass = {
	Id?: string;
	ApiVersion?: string;
	NamespacePrefix: string;
	Name: string;
	Body?: string;
	LastModifiedDate: Date;
};

export type ApexClassWithBody = ApexClass & {
	Body: string;
};
