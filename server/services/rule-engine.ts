import type { ParsedExcelData } from '../types/excel.js';
import type { Rule, SimpleRule, AggregationRule, Condition, SimpleCondition, CompoundCondition } from '../types/rule.js';
import { aggregationEngine } from './aggregation-engine.js';
import { templateEngine } from './template-engine.js';

export interface AlertResult {
  ruleId: string;
  ruleName: string;
  recipient: string;
  message: string;
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  type: 'simple' | 'aggregation';
  alertsGenerated: number;
  alerts: AlertResult[];
}

export class RuleEngine {
  evaluateRule(
    rule: Rule,
    data: ParsedExcelData,
    recipientsMap: Record<string, string>
  ): RuleEvaluationResult {
    if (rule.type === 'aggregation') {
      return this.evaluateAggregationRule(rule as AggregationRule, data, recipientsMap);
    } else {
      return this.evaluateSimpleRule(rule as SimpleRule, data, recipientsMap);
    }
  }

  private evaluateAggregationRule(
    rule: AggregationRule,
    data: ParsedExcelData,
    recipientsMap: Record<string, string>
  ): RuleEvaluationResult {
    const results = aggregationEngine.evaluate(rule, data);
    
    const alerts: AlertResult[] = [];
    
    for (const result of results) {
      const recipients = this.resolveRecipients(rule.recipients, result.groupValue, recipientsMap);
      
      for (const recipient of recipients) {
        alerts.push({
          ruleId: rule.id,
          ruleName: rule.name,
          recipient,
          message: result.message
        });
      }
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      type: 'aggregation',
      alertsGenerated: alerts.length,
      alerts
    };
  }

  private evaluateSimpleRule(
    rule: SimpleRule,
    data: ParsedExcelData,
    recipientsMap: Record<string, string>
  ): RuleEvaluationResult {
    const alerts: AlertResult[] = [];
    const matchingRows = data.rows.filter(row => 
      this.evaluateCondition(row, rule.condition)
    );

    if (matchingRows.length === 0) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        type: 'simple',
        alertsGenerated: 0,
        alerts: []
      };
    }

    const groupedByRecipient = new Map<string, Record<string, unknown>[]>();
    
    for (const row of matchingRows) {
      const recipients = this.resolveRecipientsFromRow(rule.recipients, row, recipientsMap);
      
      for (const recipient of recipients) {
        if (!groupedByRecipient.has(recipient)) {
          groupedByRecipient.set(recipient, []);
        }
        groupedByRecipient.get(recipient)!.push(row);
      }
    }

    for (const [recipient, rows] of groupedByRecipient) {
      const message = templateEngine.renderMultiple(
        rule.message_template,
        rows,
        { count: rows.length, dateRange: data.metadata.dateRange || '' }
      );

      alerts.push({
        ruleId: rule.id,
        ruleName: rule.name,
        recipient,
        message
      });
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      type: 'simple',
      alertsGenerated: alerts.length,
      alerts
    };
  }

  private resolveRecipients(
    recipientTemplates: string[],
    groupValue: string,
    recipientsMap: Record<string, string>
  ): string[] {
    const resolved: string[] = [];

    for (const template of recipientTemplates) {
      if (template === '{{Ejecutivo}}' || template === '{{groupValue}}') {
        const phoneNumber = recipientsMap[groupValue];
        if (phoneNumber) {
          resolved.push(phoneNumber);
        }
      } else if (template.startsWith('{{') && template.endsWith('}}')) {
        const fieldName = template.slice(2, -2);
        const phoneNumber = recipientsMap[fieldName];
        if (phoneNumber) {
          resolved.push(phoneNumber);
        }
      } else {
        const phoneNumber = recipientsMap[template];
        if (phoneNumber) {
          resolved.push(phoneNumber);
        } else if (template.startsWith('+') || template.match(/^\d+$/)) {
          resolved.push(template);
        }
      }
    }

    return [...new Set(resolved)];
  }

  private resolveRecipientsFromRow(
    recipientTemplates: string[],
    row: Record<string, unknown>,
    recipientsMap: Record<string, string>
  ): string[] {
    const resolved: string[] = [];

    for (const template of recipientTemplates) {
      if (template.startsWith('{{') && template.endsWith('}}')) {
        const fieldName = template.slice(2, -2);
        const fieldValue = String(row[fieldName] ?? '');
        const phoneNumber = recipientsMap[fieldValue];
        if (phoneNumber) {
          resolved.push(phoneNumber);
        }
      } else {
        const phoneNumber = recipientsMap[template];
        if (phoneNumber) {
          resolved.push(phoneNumber);
        } else if (template.startsWith('+') || template.match(/^\d+$/)) {
          resolved.push(template);
        }
      }
    }

    return [...new Set(resolved)];
  }

  private evaluateCondition(row: Record<string, unknown>, condition: Condition): boolean {
    if ('conditions' in condition) {
      return this.evaluateCompoundCondition(row, condition as CompoundCondition);
    }
    return this.evaluateSimpleCondition(row, condition as SimpleCondition);
  }

  private evaluateCompoundCondition(row: Record<string, unknown>, condition: CompoundCondition): boolean {
    const { operator, conditions } = condition;
    
    if (operator === 'AND') {
      return conditions.every((c: Condition) => this.evaluateCondition(row, c));
    } else {
      return conditions.some((c: Condition) => this.evaluateCondition(row, c));
    }
  }

  private evaluateSimpleCondition(row: Record<string, unknown>, condition: SimpleCondition): boolean {
    const { field, operator, value } = condition;
    const fieldValue = row[field];

    switch (operator) {
      case 'equals':
        return String(fieldValue) === String(value);
      case 'not_equals':
        return String(fieldValue) !== String(value);
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'not_contains':
        return !String(fieldValue).includes(String(value));
      case 'in':
        return Array.isArray(value) && value.map(String).includes(String(fieldValue));
      case 'not_in':
        return Array.isArray(value) && !value.map(String).includes(String(fieldValue));
      default:
        return false;
    }
  }
}

export const ruleEngine = new RuleEngine();
