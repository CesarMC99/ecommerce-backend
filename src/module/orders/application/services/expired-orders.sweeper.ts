import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { OrderLifecycleService } from './order-lifecycle.service';

/** Cada cuánto se buscan pedidos caducados. */
const SWEEP_INTERVAL_MS = 5 * 60_000;

/**
 * Tarea periódica: cierra los pedidos que no se pagaron a tiempo y devuelve
 * su stock a la tienda. Sin esto, alguien que abre el pago y se va dejaría
 * las unidades bloqueadas para siempre.
 *
 * Un setInterval sencillo basta con un único servidor. Con varias réplicas
 * seguiría siendo correcto (las transiciones son atómicas, solo una gana),
 * aunque convendría una cola o un cron dedicado.
 */
@Injectable()
export class ExpiredOrdersSweeper
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(ExpiredOrdersSweeper.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly lifecycle: OrderLifecycleService) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS);
    // unref: el temporizador no impide que el proceso termine (tests, cierre)
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async sweep(): Promise<void> {
    try {
      const closed = await this.lifecycle.closeExpired();
      if (closed > 0)
        this.logger.log(`${closed} pedido(s) caducado(s) cerrados`);
    } catch (error) {
      this.logger.error('Falló el barrido de pedidos caducados', error);
    }
  }
}
