import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

/**
 * Custom Logger Service
 * 필요시 Winston, Pino 등으로 확장 가능
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  log(message: string, context?: string) {
    console.log(`[LOG] ${context ? `[${context}]` : ''} ${message}`);
  }

  error(message: string, trace?: string, context?: string) {
    console.error(
      `[ERROR] ${context ? `[${context}]` : ''} ${message}`,
      trace,
    );
  }

  warn(message: string, context?: string) {
    console.warn(`[WARN] ${context ? `[${context}]` : ''} ${message}`);
  }

  debug(message: string, context?: string) {
    console.debug(`[DEBUG] ${context ? `[${context}]` : ''} ${message}`);
  }

  verbose(message: string, context?: string) {
    console.log(`[VERBOSE] ${context ? `[${context}]` : ''} ${message}`);
  }
}
