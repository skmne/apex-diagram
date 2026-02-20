export default class QueryResult<T = Record<string, unknown>> {
  done!: boolean;
  entityTypeName!: string;
  nextRecordsUrl!: string;
  queryLocator!: string;
  records!: T[];
  size!: string;
  totalSize!: string;
}
