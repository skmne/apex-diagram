export default class QueryResult {
  done!: boolean;
  entityTypeName!: string;
  nextRecordsUrl!: string;
  queryLocator!: string;
  records!: any;
  size!: string;
  totalSize!: string;
}
