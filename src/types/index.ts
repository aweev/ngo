// NGO OS Type Exports
// Export all types for easy importing

// Database types
// `database.ts` is generated (pnpm supabase:gen-types); the value unions live
// in the hand-maintained `database-enums.ts` so regeneration cannot delete them.
export type { Json } from './database';
export type {
    OrganizationSize,
    OrganizationStatus,
    MemberRole,
    EmploymentType,
    WorkerStatus,
    VolunteerStatus,
    BackgroundCheckStatus,
    HoursStatus,
    PartnerType,
    PartnershipType,
    PartnerStatus,
    DonorType,
    DonorStatus,
    DonationType,
    DonationStatus,
    ProjectStatus,
    CampaignStatus,
} from './database-enums';

// Domain types
export type {
    Organization,
    OrganizationInsert,
    OrganizationUpdate,
    OrganizationMember,
    OrganizationMemberInsert,
    OrganizationMemberUpdate,
} from './domain/organization';

export type {
    Worker,
    WorkerInsert,
    WorkerUpdate,
    EmergencyContact as WorkerEmergencyContact,
    WorkerDocument,
} from './domain/workers';

export type {
    Volunteer,
    VolunteerInsert,
    VolunteerUpdate,
    VolunteerHours,
    VolunteerHoursInsert,
    VolunteerHoursUpdate,
    Availability,
    EmergencyContact as VolunteerEmergencyContact,
    VolunteerDocument,
} from './domain/volunteers';

export type {
    Partner,
    PartnerInsert,
    PartnerUpdate,
    PartnerDocument,
} from './domain/partners';

export type {
    Donor,
    DonorInsert,
    DonorUpdate,
    Donation,
    DonationInsert,
    DonationUpdate,
    CommunicationPreferences,
} from './domain/donors';

export type {
    Project,
    ProjectInsert,
    ProjectUpdate,
    Campaign,
    CampaignInsert,
    CampaignUpdate,
    ProjectDocument,
} from './domain/projects';

export type {
    AuditLog,
    AuditLogInsert,
} from './domain/audit';

export type {
    AutomationRule,
    AutomationRuleInsert,
    AutomationRuleUpdate,
    AutomationExecution,
    AutomationTemplate,
    AutomationCondition,
    AutomationAction,
} from './domain/automations';

export type {
    WorkflowDefinition,
    WorkflowDefinitionInsert,
    WorkflowDefinitionUpdate,
    WorkflowInstance,
    WorkflowStep,
    WorkflowStepHistory,
} from './domain/workflows';

export type {
    NotificationTemplate,
    NotificationTemplateInsert,
    NotificationTemplateUpdate,
    Notification,
    NotificationPreferences,
} from './domain/notifications';

export type {
    FormDefinition,
    FormDefinitionInsert,
    FormDefinitionUpdate,
    FormField,
    FormSubmission,
} from './domain/forms';

export type {
    Integration,
    IntegrationInsert,
    IntegrationUpdate,
    Webhook,
    WebhookDelivery,
} from './domain/integrations';

export type {
    CustomRole,
    CustomRoleInsert,
    CustomRoleUpdate,
    RoleAssignment,
    PermissionOverride,
} from './domain/rbac';

export type {
    ScheduledJob,
    ScheduledJobInsert,
    ScheduledJobUpdate,
    JobExecution,
} from './domain/scheduling';

export type {
    ReportDefinition,
    ReportDefinitionInsert,
    ReportDefinitionUpdate,
    ReportSnapshot,
} from './domain/reporting';

export type {
    ContentPage,
    ContentPageInsert,
    ContentPageUpdate,
    ContentBlock,
    MediaLibraryItem,
} from './domain/content';

export type {
    OrgEvent,
    OrgEventInsert,
    OrgEventUpdate,
    EventRegistration,
} from './domain/events';

export type {
    Tag,
    TagInsert,
    TagUpdate,
    TagAssignment,
} from './domain/tags';

export type {
    Conversation,
    ConversationInsert,
    ConversationMessage,
    ConversationMessageInsert,
} from './domain/messaging';

export type {
    ImpactMetric,
    ImpactMetricInsert,
    ImpactMetricUpdate,
    ImpactMeasurement,
    ImpactGoal,
} from './domain/impact';

export type {
    Budget,
    BudgetInsert,
    BudgetUpdate,
    BudgetLine,
    Expense,
    ExpenseInsert,
    ExpenseUpdate,
} from './domain/financial';

export type {
    FeatureFlag,
    GovernanceApproval,
    ApprovalStatus,
    ApprovalEntityType,
    PerformanceReview,
    ReviewSubjectType,
    HRLifecycleRecord,
    HRLifecycleType,
    HRLifecycleStatus,
    TranslationData,
} from './domain/governance';
