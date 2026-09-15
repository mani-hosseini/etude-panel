import {
  decodeMulterFilename,
  isGeneratedStorageName,
  nameFromUpload,
  sanitizeOriginalName,
} from './original-filename';

describe('decodeMulterFilename', () => {
  it('repairs Persian names that Multer decoded as latin1', () => {
    const utf8 = 'آزمون میان‌ترم.pdf';
    const mojibake = Buffer.from(utf8, 'utf8').toString('latin1');
    expect(decodeMulterFilename(mojibake)).toBe(utf8);
  });

  it('leaves an already-correct Persian name alone', () => {
    expect(decodeMulterFilename('پاسخ من.pdf')).toBe('پاسخ من.pdf');
  });

  it('leaves ascii names alone', () => {
    expect(decodeMulterFilename('midterm.pdf')).toBe('midterm.pdf');
  });
});

describe('sanitizeOriginalName', () => {
  it('keeps a safe pdf name and strips path characters', () => {
    expect(sanitizeOriginalName('پاسخ من.pdf')).toBe('پاسخ من.pdf');
    expect(sanitizeOriginalName('../etc/passwd.pdf')).toBe('.._etc_passwd.pdf');
    expect(sanitizeOriginalName('notes')).toBe('notes.pdf');
  });

  it('does not show generated storage keys to users', () => {
    expect(isGeneratedStorageName('exam-mabc12-a1b2c3d4.pdf')).toBe(true);
    expect(sanitizeOriginalName('exam-mabc12-a1b2c3d4.pdf', 'برگه-آزمون.pdf')).toBe(
      'برگه-آزمون.pdf',
    );
  });

  it('prefers the UTF-8 form-field name over a garbled Multer name', () => {
    const utf8 = 'آزمون میان‌ترم.pdf';
    const mojibake = Buffer.from(utf8, 'utf8').toString('latin1');
    expect(nameFromUpload({ originalname: mojibake }, utf8, 'برگه-آزمون.pdf')).toBe(
      utf8,
    );
  });
});
