import { z } from 'zod';

export const OperatorSchema = z.enum([
  'equals',
  'not_equals',
  'greater_than',
  'less_than',
  'contains',
  'not_contains',
  'in',
  'not_in'
]);

export const SimpleConditionSchema: z.ZodType<{
  field: string;
  operator: z.infer<typeof OperatorSchema>;
  value: string | number | boolean | string[] | number[];
}> = z.object({
  field: z.string(),
  operator: OperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.array(z.number())])
});

export interface CompoundCondition {
  operator: 'AND' | 'OR';
  conditions: Condition[];
}

export const CompoundConditionSchema: z.ZodType<CompoundCondition> = z.object({
  operator: z.enum(['AND', 'OR']),
  conditions: z.array(z.lazy(() => ConditionSchema))
});

export const ConditionSchema = z.union([SimpleConditionSchema, CompoundConditionSchema]);

export type Condition = z.infer<typeof ConditionSchema>;
export type SimpleCondition = z.infer<typeof SimpleConditionSchema>;

export const SortSchema = z.object({
  field: z.string(),
  order: z.enum(['asc', 'desc'])
});

export const AggregateSchema = z.object({
  group_by: z.string(),
  metric: z.enum(['count', 'sum', 'avg', 'min', 'max']),
  sort: SortSchema.optional(),
  limit: z.number().optional()
});

export const PercentageSchema = z.object({
  denominator: z.enum(['count_distinct', 'count', 'sum']),
  denominator_field: z.string()
});

export const AggregationAnalysisSchema = z.object({
  group_by_field: z.string(),
  filter: ConditionSchema.optional(),
  aggregate: AggregateSchema.optional(),
  select_fields: z.array(z.string()).optional(),
  sort: SortSchema.optional(),
  calculate_percentage: PercentageSchema.optional(),
  unique_by: z.string().optional()
});

export const SimpleRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal('simple'),
  enabled: z.boolean().default(true),
  condition: ConditionSchema,
  message_template: z.string(),
  recipients: z.array(z.string())
});

export const AggregationRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal('aggregation'),
  enabled: z.boolean().default(true),
  analysis: AggregationAnalysisSchema,
  message_template: z.string(),
  recipients: z.array(z.string())
});

export const RuleSchema = z.union([SimpleRuleSchema, AggregationRuleSchema]);

export const AlertRulesConfigSchema = z.object({
  rules: z.array(RuleSchema)
});

export type Sort = z.infer<typeof SortSchema>;
export type Aggregate = z.infer<typeof AggregateSchema>;
export type Percentage = z.infer<typeof PercentageSchema>;
export type AggregationAnalysis = z.infer<typeof AggregationAnalysisSchema>;
export type SimpleRule = z.infer<typeof SimpleRuleSchema>;
export type AggregationRule = z.infer<typeof AggregationRuleSchema>;
export type Rule = z.infer<typeof RuleSchema>;
export type AlertRulesConfig = z.infer<typeof AlertRulesConfigSchema>;
