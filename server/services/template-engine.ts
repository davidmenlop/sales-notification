import Handlebars from 'handlebars';

export class TemplateEngine {
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
  }

  render(template: string, data: Record<string, unknown>): string {
    const compiled = this.handlebars.compile(template);
    return compiled(data);
  }

  renderMultiple(template: string, items: Record<string, unknown>[], extraData?: Record<string, unknown>): string {
    const data = {
      items,
      ...extraData
    };
    return this.render(template, data);
  }
}

export const templateEngine = new TemplateEngine();
