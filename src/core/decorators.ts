import { criarInstanciaLogger } from './logger.js';
import { LoggerInstancia, LogMethodOptions, NivelLog } from '../types/index.js';

/**
 * Logger padrão usado pelo decorador quando nenhum logger é informado nas opções.
 */
const decoratorDefaultLogger = criarInstanciaLogger();

/**
 * Resolve o método de log pelo nível configurado, com fallback para `logger.info`.
 */
function getLogMethod(
  logger: LoggerInstancia,
  level: NivelLog,
): (message: string, meta?: Record<string, unknown>) => void {
  const candidate = (logger as any)[level];
  if (typeof candidate === 'function') {
    return candidate.bind(logger);
  }
  return logger.info.bind(logger);
}

/**
 * Decorador para registrar entrada, saída e erro de métodos de classe.
 *
 * @example
 * ```ts
 * @LogMethod({ level: 'info', logArgs: true, logResult: false })
 * async criarUsuario(dto: CreateUserDto) { ... }
 * ```
 *
 * @param options Configurações de nível e payload dos logs automáticos.
 * @returns Method decorator compatível com métodos síncronos e assíncronos.
 */
export function LogMethod(options: LogMethodOptions = {}): MethodDecorator {
  const {
    level = 'info',
    logArgs = true,
    logResult = false,
    logger = decoratorDefaultLogger,
  } = options;

  return (target, propertyKey, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    if (typeof originalMethod !== 'function') return descriptor;

    descriptor.value = function wrappedMethod(this: unknown, ...args: unknown[]) {
      const methodName = String(propertyKey);
      const className = (target as any)?.constructor?.name ?? 'UnknownClass';
      const logAtLevel = getLogMethod(logger, level);
      const startedAt = process.hrtime.bigint();

      logAtLevel('Method entry', {
        className,
        methodName,
        args: logArgs ? args : undefined,
      });

      const finishMeta = () => ({
        className,
        methodName,
        durationMs: Number((Number(process.hrtime.bigint() - startedAt) / 1_000_000).toFixed(3)),
      });

      try {
        const result = originalMethod.apply(this, args);

        if (result && typeof (result as Promise<unknown>).then === 'function') {
          return (result as Promise<unknown>)
            .then((resolved) => {
              logAtLevel('Method exit', {
                ...finishMeta(),
                result: logResult ? resolved : undefined,
              });
              return resolved;
            })
            .catch((error: unknown) => {
              logger.error('Method error', {
                ...finishMeta(),
                error,
              });
              throw error;
            });
        }

        logAtLevel('Method exit', {
          ...finishMeta(),
          result: logResult ? result : undefined,
        });
        return result;
      } catch (error) {
        logger.error('Method error', {
          ...finishMeta(),
          error,
        });
        throw error;
      }
    };

    return descriptor;
  };
}
