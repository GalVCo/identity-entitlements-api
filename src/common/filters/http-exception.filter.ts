import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse() as any;
      const message = response?.message || exception.message || 'Error';
      const code = response?.code || exception.name || 'HTTP_ERROR';
      const details = response?.details || (typeof response === 'object' ? response : undefined);
      res.status(status).json({ code, message, details });
      return;
    }

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception?.message || 'Internal server error';
    res.status(status).json({ code: 'INTERNAL', message });
  }
}

