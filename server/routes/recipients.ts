import { Router, type Request, type Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import type { RecipientsConfig } from '../types/recipient.js';
import { RecipientsConfigSchema } from '../types/recipient.js';
import { excelParser } from '../services/excel-parser.js';
import { fileManager } from '../services/file-manager.js';

const CONFIG_PATH = path.join(process.cwd(), 'config', 'recipients.json');

export const recipientsRouter = Router();

function loadRecipients(): RecipientsConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    return { executives: {}, groups: {} };
  }
  const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  return RecipientsConfigSchema.parse(data);
}

function saveRecipients(config: RecipientsConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

recipientsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const config = loadRecipients();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar destinatarios', details: String(error) });
  }
});

recipientsRouter.get('/executives', async (_req: Request, res: Response) => {
  try {
    if (!fileManager.hasCurrentFile()) {
      return res.status(400).json({ 
        error: 'No hay archivo Excel cargado. Por favor, sube un archivo primero.' 
      });
    }

    const EXCEL_PATH = fileManager.getCurrentFilePath();
    const data = await excelParser.parse(EXCEL_PATH);
    const executives = excelParser.getUniqueValues(data, 'Ejecutivo');
    
    const config = loadRecipients();
    
    const result = executives.map(name => ({
      name,
      whatsapp: config.executives[name]?.whatsapp || null,
      enabled: config.executives[name]?.enabled ?? true,
      configured: !!config.executives[name]?.whatsapp
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ejecutivos', details: String(error) });
  }
});

recipientsRouter.post('/', (req: Request, res: Response) => {
  try {
    const { name, whatsapp, enabled = true } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const config = loadRecipients();
    config.executives[name] = {
      whatsapp: whatsapp || null,
      enabled,
      lastUpdated: new Date().toISOString()
    };
    
    saveRecipients(config);
    res.status(201).json(config.executives[name]);
  } catch (error) {
    res.status(400).json({ error: 'Error al crear destinatario', details: String(error) });
  }
});

recipientsRouter.put('/:name', (req: Request<{ name: string }>, res: Response) => {
  try {
    const name = req.params.name;
    const { whatsapp, enabled } = req.body;
    
    const config = loadRecipients();
    
    if (!config.executives[name]) {
      config.executives[name] = {
        whatsapp: null,
        enabled: true,
        lastUpdated: null
      };
    }

    if (whatsapp !== undefined) config.executives[name].whatsapp = whatsapp;
    if (enabled !== undefined) config.executives[name].enabled = enabled;
    config.executives[name].lastUpdated = new Date().toISOString();
    
    saveRecipients(config);
    res.json(config.executives[name]);
  } catch (error) {
    res.status(400).json({ error: 'Error al actualizar destinatario', details: String(error) });
  }
});

recipientsRouter.delete('/:name', (req: Request<{ name: string }>, res: Response) => {
  try {
    const name = req.params.name;
    const config = loadRecipients();
    
    if (!config.executives[name]) {
      return res.status(404).json({ error: 'Destinatario no encontrado' });
    }
    
    delete config.executives[name];
    saveRecipients(config);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar destinatario', details: String(error) });
  }
});

recipientsRouter.post('/sync', async (_req: Request, res: Response) => {
  try {
    if (!fileManager.hasCurrentFile()) {
      return res.status(400).json({ 
        error: 'No hay archivo Excel cargado. Por favor, sube un archivo primero.' 
      });
    }

    const EXCEL_PATH = fileManager.getCurrentFilePath();
    const data = await excelParser.parse(EXCEL_PATH);
    const executives = excelParser.getUniqueValues(data, 'Ejecutivo');
    
    const config = loadRecipients();
    
    for (const name of executives) {
      if (!config.executives[name]) {
        config.executives[name] = {
          whatsapp: null,
          enabled: true,
          lastUpdated: new Date().toISOString()
        };
      }
    }
    
    saveRecipients(config);
    
    res.json({ 
      success: true, 
      total: executives.length,
      message: `${executives.length} ejecutivos sincronizados`
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al sincronizar', details: String(error) });
  }
});
