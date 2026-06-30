import type { ExcelRow, ParsedExcelData } from '../types/excel.js';
import type { 
  AggregationRule, 
  Condition, 
  SimpleCondition, 
  CompoundCondition
} from '../types/rule.js';

export interface AggregationResult {
  groupKey: string;
  groupValue: string;
  items: Record<string, unknown>[];
  message: string;
}

export class AggregationEngine {
  evaluate(
    rule: AggregationRule, 
    data: ParsedExcelData
  ): AggregationResult[] {
    const { analysis, message_template: messageTemplate } = rule;
    const { group_by_field, filter, aggregate, select_fields, sort, calculate_percentage, unique_by } = analysis;

    const rows = data.rows;
    const groupedData = new Map<string, ExcelRow[]>();

    for (const row of rows) {
      const groupValue = row[group_by_field];
      if (groupValue === null || groupValue === undefined || groupValue === '') continue;
      
      const key = String(groupValue);
      if (!groupedData.has(key)) {
        groupedData.set(key, []);
      }
      groupedData.get(key)!.push(row);
    }

    const results: AggregationResult[] = [];

    for (const [groupKey, groupRows] of groupedData) {
      let filteredRows = groupRows;
      if (filter) {
        filteredRows = groupRows.filter(row => this.evaluateCondition(row, filter));
      }

      let processedItems: Record<string, unknown>[];

      if (aggregate) {
        const { group_by, metric, sort: aggSort, limit } = aggregate;
        
        const aggregated = new Map<string, { count: number; sum: number; values: number[] }>();
        
        for (const row of filteredRows) {
          const aggKey = String(row[group_by] ?? 'N/A');
          if (!aggregated.has(aggKey)) {
            aggregated.set(aggKey, { count: 0, sum: 0, values: [] });
          }
          const agg = aggregated.get(aggKey)!;
          agg.count++;
          
          const numericValue = Number(row[group_by]);
          if (!isNaN(numericValue)) {
            agg.sum += numericValue;
            agg.values.push(numericValue);
          }
        }

        processedItems = [];
        for (const [key, agg] of aggregated) {
          const item: Record<string, unknown> = {
            [group_by]: key,
            count: agg.count
          };

          if (metric === 'sum') item[`${metric}_${group_by}`] = agg.sum;
          if (metric === 'avg' && agg.values.length > 0) {
            item[`${metric}_${group_by}`] = agg.sum / agg.values.length;
          }
          if (metric === 'min' && agg.values.length > 0) {
            item[`${metric}_${group_by}`] = Math.min(...agg.values);
          }
          if (metric === 'max' && agg.values.length > 0) {
            item[`${metric}_${group_by}`] = Math.max(...agg.values);
          }

          processedItems.push(item);
        }

        if (aggSort) {
          processedItems.sort((a, b) => {
            const field = aggSort.field === group_by ? group_by : 
                         aggSort.field === 'count' ? 'count' : aggSort.field;
            const aVal = a[field] as number;
            const bVal = b[field] as number;
            return aggSort.order === 'asc' ? aVal - bVal : bVal - aVal;
          });
        }

        if (limit) {
          processedItems = processedItems.slice(0, limit);
        }
      } else {
        processedItems = filteredRows.map(row => {
          if (select_fields) {
            const item: Record<string, unknown> = {};
            for (const field of select_fields) {
              item[field] = row[field];
            }
            return item;
          }
          return { ...row };
        });

        if (unique_by) {
          const seen = new Set<string>();
          processedItems = processedItems.filter(item => {
            const key = String(item[unique_by] ?? '');
            if (seen.has(key)) {
              return false;
            }
            seen.add(key);
            return true;
          });
        }

        if (sort) {
          processedItems.sort((a, b) => {
            const aVal = a[sort.field];
            const bVal = b[sort.field];
            if (typeof aVal === 'number' && typeof bVal === 'number') {
              return sort.order === 'asc' ? aVal - bVal : bVal - aVal;
            }
            const aStr = String(aVal ?? '');
            const bStr = String(bVal ?? '');
            return sort.order === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
          });
        }
      }

      if (calculate_percentage) {
        const { denominator, denominator_field } = calculate_percentage;
        let denominatorValue = 0;

        if (denominator === 'count_distinct') {
          const uniqueValues = new Set<string>();
          for (const row of groupRows) {
            const val = row[denominator_field];
            if (val !== null && val !== undefined && val !== '') {
              uniqueValues.add(String(val));
            }
          }
          denominatorValue = uniqueValues.size;
        } else if (denominator === 'count') {
          denominatorValue = groupRows.length;
        } else if (denominator === 'sum') {
          for (const row of groupRows) {
            const val = Number(row[denominator_field]);
            if (!isNaN(val)) denominatorValue += val;
          }
        }

        for (const item of processedItems) {
          const count = item['count'] as number || 0;
          item['percentage'] = denominatorValue > 0 
            ? Math.round((count / denominatorValue) * 10000) / 100 
            : 0;
        }
      }

      if (processedItems.length === 0) continue;

      const templateData: Record<string, unknown> = {
        items: processedItems,
        [group_by_field]: groupKey,
        limit: aggregate?.limit || processedItems.length,
        total: processedItems.length
      };

      results.push({
        groupKey,
        groupValue: groupKey,
        items: processedItems,
        message: this.renderTemplate(messageTemplate, templateData)
      });
    }

    return results;
  }

  private evaluateCondition(row: ExcelRow, condition: Condition): boolean {
    if ('conditions' in condition) {
      return this.evaluateCompoundCondition(row, condition as CompoundCondition);
    }
    return this.evaluateSimpleCondition(row, condition as SimpleCondition);
  }

  private evaluateCompoundCondition(row: ExcelRow, condition: CompoundCondition): boolean {
    const { operator, conditions } = condition;
    
    if (operator === 'AND') {
      return conditions.every((c: Condition) => this.evaluateCondition(row, c));
    } else {
      return conditions.some((c: Condition) => this.evaluateCondition(row, c));
    }
  }

  private evaluateSimpleCondition(row: ExcelRow, condition: SimpleCondition): boolean {
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

  private renderTemplate(template: string, data: Record<string, unknown>): string {
    let result = template;
    
    const eachMatch = result.match(/\{\{#each items\}\}([\s\S]*?)\{\{\/each\}\}/);
    if (eachMatch) {
      const itemTemplate = eachMatch[1];
      const items = data['items'] as Record<string, unknown>[];
      const renderedItems = items.map(item => {
        let itemResult = itemTemplate;
        for (const [key, val] of Object.entries(item)) {
          const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          itemResult = itemResult.replace(new RegExp(`\\{\\{${safeKey}\\}\\}`, 'g'), String(val ?? ''));
        }
        return itemResult;
      }).join('');
      result = result.replace(eachMatch[0], renderedItems);
    }

    for (const [key, val] of Object.entries(data)) {
      if (key === 'items') continue;
      const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(`\\{\\{${safeKey}\\}\\}`, 'g'), String(val ?? ''));
    }

    return result;
  }
}

export const aggregationEngine = new AggregationEngine();
