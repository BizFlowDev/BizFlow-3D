import { ValidationError } from '../../errors/ValidationError.js';

/** Inclusive local date inputs, exclusive end timestamp for all SQL queries. */
export function reportPeriod(from: unknown, to: unknown): { from: Date; to: Date } {
  function parse(value: unknown): Date {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ValidationError('Ngày báo cáo phải có định dạng YYYY-MM-DD');
    const utc = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(utc.getTime()) || utc.toISOString().slice(0, 10) !== value) throw new ValidationError('Ngày báo cáo không tồn tại');
    return new Date(`${value}T00:00:00+07:00`);
  }
  const start = parse(from), end = parse(to);
  if (start > end) throw new ValidationError('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc');
  return { from: start, to: new Date(end.getTime() + 86_400_000) };
}
