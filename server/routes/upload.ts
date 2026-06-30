import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { fileManager } from '../services/file-manager.js';
import { excelValidator } from '../services/excel-validator.js';

const tempDir = path.join(process.cwd(), 'data', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const upload = multer({
  dest: tempDir,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.match(/\.(xlsx|xls)$/)) {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
      return;
    }
    cb(null, true);
  }
});

export const uploadRouter = Router();

const uploadMiddleware = upload.single('file');

uploadRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'El archivo es demasiado grande (máximo 10MB)' });
      }
      return res.status(400).json({ error: `Error al subir el archivo: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    const validation = await excelValidator.validate(req.file.path);

    if (!validation.valid) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'El archivo no es válido',
        details: validation.errors,
        columns: validation.columns
      });
    }

    await fileManager.replaceFile(req.file.path);

    res.json({
      success: true,
      message: 'Archivo cargado exitosamente',
      columns: validation.columns
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Error al procesar el archivo', details: String(error) });
  }
});

uploadRouter.get('/info', async (_req: Request, res: Response) => {
  try {
    const info = await fileManager.getFileInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener información del archivo' });
  }
});
