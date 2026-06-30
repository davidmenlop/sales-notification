import { Router, type Request, type Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { excelParser } from '../services/excel-parser.js';
import { ruleEngine } from '../services/rule-engine.js';
import { fileManager } from '../services/file-manager.js';
import type { AlertRulesConfig } from '../types/rule.js';
import type { RecipientsConfig } from '../types/recipient.js';

const RULES_PATH = path.join(process.cwd(), 'config', 'alert-rules.json');
const RECIPIENTS_PATH = path.join(process.cwd(), 'config', 'recipients.json');

export const previewRouter = Router();

previewRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { ruleIds } = req.body;

    if (!fileManager.hasCurrentFile()) {
      return res.status(400).json({ 
        error: 'No hay archivo Excel cargado. Por favor, sube un archivo primero.' 
      });
    }

    if (!fs.existsSync(RULES_PATH)) {
      return res.status(404).json({ error: 'Archivo de reglas no encontrado' });
    }

    const rulesConfig: AlertRulesConfig = JSON.parse(fs.readFileSync(RULES_PATH, 'utf-8'));
    const recipientsConfig: RecipientsConfig = fs.existsSync(RECIPIENTS_PATH)
      ? JSON.parse(fs.readFileSync(RECIPIENTS_PATH, 'utf-8'))
      : { executives: {}, groups: {} };

    const recipientsMap: Record<string, string> = {};
    for (const [name, data] of Object.entries(recipientsConfig.executives)) {
      if (data.whatsapp) {
        recipientsMap[name] = data.whatsapp;
      }
    }

    const EXCEL_PATH = fileManager.getCurrentFilePath();
    const data = await excelParser.parse(EXCEL_PATH);

    let selectedRules = rulesConfig.rules.filter(r => r.enabled);
    if (ruleIds && Array.isArray(ruleIds) && ruleIds.length > 0) {
      selectedRules = selectedRules.filter(r => ruleIds.includes(r.id));
    }

    const previews: Array<{
      ruleId: string;
      ruleName: string;
      alerts: Array<{
        recipient: string;
        recipientName: string;
        message: string;
      }>;
    }> = [];

    for (const rule of selectedRules) {
      const result = ruleEngine.evaluateRule(rule, data, recipientsMap);
      
      const nameMap: Record<string, string> = {};
      for (const [name, phone] of Object.entries(recipientsMap)) {
        nameMap[phone] = name;
      }

      const alerts = result.alerts.map(alert => ({
        recipient: alert.recipient,
        recipientName: nameMap[alert.recipient] || alert.recipient,
        message: alert.message
      }));

      previews.push({
        ruleId: rule.id,
        ruleName: rule.name,
        alerts
      });
    }

    res.json({ previews });
  } catch (error) {
    res.status(500).json({ error: 'Error al generar preview', details: String(error) });
  }
});
