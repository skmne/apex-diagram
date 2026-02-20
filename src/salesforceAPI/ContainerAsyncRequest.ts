import QueryResult from "./QueryResult";

export default class ContainerAsyncRequest {
  "ApexClassMembers": QueryResult;
  "ApexComponentMembers": QueryResult;
  "ApexPageMembers": QueryResult;
  "ApexTriggerMembers": QueryResult;
  "AuraDefinitionChanges": QueryResult;
  "CreatedBy": { Id: string; Name?: string };
  "CreatedById": string;
  "CreatedDate": string;
  "CustomFieldMembers": QueryResult;
  "DeployDetails": Record<string, unknown>;
  "ErrorMsg": string;
  "IsCheckOnly": boolean;
  "IsDeleted": boolean;
  "IsRunTests": boolean;
  "LastModifiedBy": { Id: string; Name?: string };
  "LastModifiedById": string;
  "LastModifiedDate": string;
  "MetadataContainer": { Id: string; Name?: string } | null;
  "MetadataContainerId": string;
  "MetadataContainerMember": { Id: string; Name?: string } | null;
  "MetadataContainerMemberId": string;
  "State": string;
  "SystemModstamp": string;
  "ValidationRuleMembers": QueryResult;
  "WorkflowAlertMembers": QueryResult;
  "WorkflowFieldUpdateMembers": QueryResult;
  "WorkflowOutboundMessageMembers": QueryResult;
  "WorkflowRuleMembers": QueryResult;
  "WorkflowTaskMembers": QueryResult;
}
