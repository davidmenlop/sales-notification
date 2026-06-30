import { Router, type Request, type Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { excelParser } from '../services/excel-parser.js';
import { ruleEngine } from '../services/rule-engine.js';
import type { WhatsAppClient } from '../services/whatsapp-client.js';
import type { AlertRulesConfig } from '../types/rule.js';
import type { RecipientsConfig } from '../types/recipient.js';

const RULES_PATH = path.join(process.cwd(), 'config', 'alert-rules.json');
const RECIPIENTS_PATH = path.join(process.cwd(), 'config', 'recipients.json');
const EXCEL_PATH = path.join(process.cwd(), 'data', 'Detalle_NSG_Softys_Consolidado.xlsx');

export function createSendRouter(whatsappClient: WhatsAppClient) {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    const { ruleIds, dryRun = false } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendLog = (type: string, message: string, data?: unknown) => {
      const log = {
        timestamp: new Date().toISOString(),
        type,
        message,
        data
      };
      res.write(`data: ${JSON.stringify(log)}\n\n`);
    };

    try {
      if (!dryRun && !whatsappClient.isReady()) {
        sendLog('error', 'WhatsApp no está conectado. Por favor, escanea el código QR primero.');
        res.write('event: done\ndata: {}\n\n');
        return res.end();
      }

      if (!fs.existsSync(EXCEL_PATH)) {
        sendLog('error', 'Archivo Excel no encontrado');
        res.write('event: done\ndata: {}\n\n');
        return res.end();
      }

      if (!fs.existsSync(RULES_PATH)) {
        sendLog('error', 'Archivo de reglas no encontrado');
        res.write('event: done\ndata: {}\n\n');
        return res.end();
      }

      sendLog('info', `Leyendo archivo: ${path.basename(EXCEL_PATH)}`);
      const data = await excelParser.parse(EXCEL_PATH);
      sendLog('success', `Excel cargado: ${data.metadata.totalRows} filas procesadas`);

      const rulesConfig: AlertRulesConfig = JSON.parse(fs.readFileSync(RULES_PATH, 'utf-8'));
      const recipientsConfig: RecipientsConfig = fs.existsSync(RECIPIENTS_PATH)
        ? JSON.parse(fs.readFileSync(RECIPIENTS_PATH, 'utf-8'))
        : { executives: {}, groups: {} };

      const recipientsMap: Record<string, string> = {};
      for (const [name, data] of Object.entries(recipientsConfig.executives)) {
        if (data.whatsapp && data.enabled) {
          recipientsMap[name] = data.whatsapp;
        }
      }

      let selectedRules = rulesConfig.rules.filter(r => r.enabled);
      if (ruleIds && Array.isArray(ruleIds) && ruleIds.length > 0) {
        selectedRules = selectedRules.filter(r => ruleIds.includes(r.id));
      }

      sendLog('info', `Evaluando ${selectedRules.length} reglas...`);

      const allAlerts: Array<{
        ruleId: string;
        ruleName: string;
        recipient: string;
        recipientName: string;
        message: string;
      }> = [];

      const nameMap: Record<string, string> = {};
      for (const [name, phone] of Object.entries(recipientsMap)) {
        nameMap[phone] = name;
      }

      for (const rule of selectedRules) {
        sendLog('info', `Evaluando regla: ${rule.name}`);
        const result = ruleEngine.evaluateRule(rule, data, recipientsMap);
        sendLog('success', `${rule.name}: ${result.alertsGenerated} alertas generadas`);

        for (const alert of result.alerts) {
          allAlerts.push({
            ruleId: alert.ruleId,
            ruleName: alert.ruleName,
            recipient: alert.recipient,
            recipientName: nameMap[alert.recipient] || alert.recipient,
            message: alert.message
          });
        }
      }

      if (allAlerts.length === 0) {
        sendLog('warning', 'No se generaron alertas para enviar');
        res.write('event: done\ndata: {}\n\n');
        return res.end();
      }

      const groupedByRecipient = new Map<string, typeof allAlerts>();
      for (const alert of allAlerts) {
        if (!groupedByRecipient.has(alert.recipient)) {
          groupedByRecipient.set(alert.recipient, []);
        }
        groupedByRecipient.get(alert.recipient)!.push(alert);
      }

      if (dryRun) {
        sendLog('info', '[DRY RUN] Mensajes que se enviarían:');
        for (const [recipient, alerts] of groupedByRecipient) {
          const name = nameMap[recipient] || recipient;
          sendLog('preview', `Para: ${name} (${recipient})`, {
            messages: alerts.map(a => ({ rule: a.ruleName, message: a.message }))
          });
        }
        sendLog('success', `[DRY RUN] Total: ${allAlerts.length} mensajes para ${groupedByRecipient.size} destinatarios`);
      } else {
        sendLog('info', `Enviando ${allAlerts.length} mensajes a ${groupedByRecipient.size} destinatarios...`);
        
        let sent = 0;
        let failed = 0;

        for (const [recipient, alerts] of groupedByRecipient) {
          const name = nameMap[recipient] || recipient;
          
          for (const alert of alerts) {
            try {
              const success = await whatsappClient.sendMessage(recipient, alert.message);
              if (success) {
                sent++;
                sendLog('success', `✓ ${name}: ${alert.ruleName} enviado`);
              } else {
                failed++;
                sendLog('error', `✗ ${name}: Error al enviar ${alert.ruleName}`);
              }
            } catch (error) {
              failed++;
              sendLog('error', `✗ ${name}: ${String(error)}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        sendLog('success', `Resumen: ${sent} enviados, ${failed} fallidos`);
      }

      res.write('event: done\ndata: {}\n\n');
      res.end();
    } catch (error) {
      sendLog('error', `Error inesperado: ${String(error)}`);
      res.write('event: done\ndata: {}\n\n');
      res.end();
    }
  });

  return router;
}
