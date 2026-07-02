import { randomUUID } from 'node:crypto';

import { NextFunction, Request, Response } from 'express';

import { CorrelationContext } from '../../shared/utils/correlation-context';

const CORRELATION_HEADER = 'x-correlation-id';

export class CorrelationIdMiddleware {
  static handle(req: Request, res: Response, next: NextFunction): void {
    const correlationId = req.header(CORRELATION_HEADER)?.trim() || randomUUID();
    res.setHeader(CORRELATION_HEADER, correlationId);
    CorrelationContext.run(correlationId, () => next());
  }
}
