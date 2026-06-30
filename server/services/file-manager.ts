import * as fs from 'fs';
import * as path from 'path';

export class FileManager {
  private currentFilePath: string;

  constructor() {
    this.currentFilePath = path.join(process.cwd(), 'data', 'current.xlsx');
  }

  getCurrentFilePath(): string {
    return this.currentFilePath;
  }

  hasCurrentFile(): boolean {
    return fs.existsSync(this.currentFilePath);
  }

  async replaceFile(tempPath: string): Promise<void> {
    if (this.hasCurrentFile()) {
      fs.unlinkSync(this.currentFilePath);
    }
    fs.renameSync(tempPath, this.currentFilePath);
  }

  async getFileInfo(): Promise<{
    exists: boolean;
    fileName?: string;
    size?: number;
    uploadedAt?: string;
  }> {
    if (!this.hasCurrentFile()) {
      return { exists: false };
    }

    const stats = fs.statSync(this.currentFilePath);
    return {
      exists: true,
      fileName: 'current.xlsx',
      size: stats.size,
      uploadedAt: stats.mtime.toISOString()
    };
  }
}

export const fileManager = new FileManager();
