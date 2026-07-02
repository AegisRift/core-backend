import { TemplateRendererService } from '../../src/modules/notifications/application/template-renderer.service';

describe('TemplateRendererService', () => {
  it('renders templates replacing placeholders', () => {
    const service = new TemplateRendererService();
    const output = service.render('two-factor-code', {
      firstName: 'Ana',
      code: '1234',
      minutesToExpire: 5,
    });

    expect(output.subject).toContain('security code');
    expect(output.html).toContain('Ana');
    expect(output.html).toContain('1234');
  });

  it('escapes html values', () => {
    const service = new TemplateRendererService();
    const output = service.render('email-confirmation', {
      firstName: '<script>',
      confirmationUrl: 'http://localhost:3001/confirm-email?token=test',
    });

    expect(output.html).toContain('&lt;script&gt;');
    expect(output.html).not.toContain('<script>');
  });
});
