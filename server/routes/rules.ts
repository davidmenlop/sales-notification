import { Router, type Request, type Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import type { AlertRulesConfig, Rule } from '../types/rule.js';
import { AlertRulesConfigSchema } from '../types/rule.js';

const CONFIG_PATH = path.join(process.cwd(), 'config', 'alert-rules.json');

export const rulesRouter = Router();

function loadRules(): AlertRulesConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    return { rules: [] };
  }
  const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  return AlertRulesConfigSchema.parse(data);
}

function saveRules(config: AlertRulesConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

rulesRouter.get('/', (_req: Request, res: Response) => {
  try {
    const config = loadRules();
    res.json(config.rules);
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar las reglas', details: String(error) });
  }
});

rulesRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const config = loadRules();
    const rule = config.rules.find(r => r.id === req.params.id);
    if (!rule) {
      return res.status(404).json({ error: 'Regla no encontrada' });
    }
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar la regla', details: String(error) });
  }
});

rulesRouter.post('/', (req: Request, res: Response) => {
  try {
    const config = loadRules();
    const newRule = RuleSchema.parse(req.body);
    
    if (config.rules.some(r => r.id === newRule.id)) {
      return res.status(400).json({ error: 'Ya existe una regla con ese ID' });
    }
    
    config.rules.push(newRule);
    saveRules(config);
    res.status(201).json(newRule);
  } catch (error) {
    res.status(400).json({ error: 'Error al crear la regla', details: String(error) });
  }
});

rulesRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const config = loadRules();
    const index = config.rules.findIndex(r => r.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Regla no encontrada' });
    }
    
    const updatedRule = RuleSchema.parse(req.body);
    config.rules[index] = updatedRule;
    saveRules(config);
    res.json(updatedRule);
  } catch (error) {
    res.status(400).json({ error: 'Error al actualizar la regla', details: String(error) });
  }
});

rulesRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const config = loadRules();
    const index = config.rules.findIndex(r => r.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Regla no encontrada' });
    }
    
    config.rules.splice(index, 1);
    saveRules(config);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la regla', details: String(error) });
  }
});

import { RuleSchema } from '../types/rule.js';
