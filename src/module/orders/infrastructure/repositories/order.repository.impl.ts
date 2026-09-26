import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter, Types } from 'mongoose';
import { Order, OrderStatus } from '../../domain/entities/order.entity';
import {
  CreateOrderData,
  OrderRepository,
} from '../../domain/repositories/order.repository';
import { OrderMapper } from '../persistence/order.mapper';
import { OrderDocument } from '../persistence/order.schema';

/** Implementación Mongoose del OrderRepository (token ORDER_REPOSITORY). */
@Injectable()
export class OrderRepositoryImpl implements OrderRepository {
  constructor(
    @InjectModel(OrderDocument.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  async create(data: CreateOrderData): Promise<Order> {
    const doc = await this.orderModel.create({
      ...data,
      userId: new Types.ObjectId(data.userId),
      lines: data.lines.map((line) => ({
        ...line,
        productId: new Types.ObjectId(line.productId),
      })),
      status: OrderStatus.PENDING_PAYMENT,
    });
    return OrderMapper.toDomain(doc);
  }

  async findById(id: string): Promise<Order | null> {
    // Un id mal formado no es un error del servidor: simplemente no existe
    if (!isValidObjectId(id)) return null;
    const doc = await this.orderModel.findById(id).exec();
    return doc ? OrderMapper.toDomain(doc) : null;
  }

  async findByPaymentIntentId(paymentIntentId: string): Promise<Order | null> {
    const doc = await this.orderModel.findOne({ paymentIntentId }).exec();
    return doc ? OrderMapper.toDomain(doc) : null;
  }

  async findPendingByUser(userId: string): Promise<Order | null> {
    const doc = await this.orderModel
      .findOne({
        userId: new Types.ObjectId(userId),
        status: OrderStatus.PENDING_PAYMENT,
      })
      .sort({ createdAt: -1 })
      .exec();
    return doc ? OrderMapper.toDomain(doc) : null;
  }

  async findExpiredPending(now: Date, limit: number): Promise<Order[]> {
    const docs = await this.orderModel
      .find({ status: OrderStatus.PENDING_PAYMENT, expiresAt: { $lt: now } })
      .sort({ expiresAt: 1 })
      .limit(limit)
      .exec();
    return docs.map((doc) => OrderMapper.toDomain(doc));
  }

  async findByUser(userId: string, status?: OrderStatus): Promise<Order[]> {
    const filter: QueryFilter<OrderDocument> = {
      userId: new Types.ObjectId(userId),
    };
    if (status) filter.status = status;
    const docs = await this.orderModel
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .exec();
    return docs.map((doc) => OrderMapper.toDomain(doc));
  }

  async setPaymentIntentId(
    orderId: string,
    paymentIntentId: string,
  ): Promise<void> {
    await this.orderModel
      .updateOne({ _id: orderId }, { $set: { paymentIntentId } })
      .exec();
  }

  markPaidIfPending(orderId: string, paidAt: Date): Promise<Order | null> {
    return this.transitionFromPending(orderId, {
      status: OrderStatus.PAID,
      paidAt,
    });
  }

  cancelIfPending(orderId: string): Promise<Order | null> {
    return this.transitionFromPending(orderId, {
      status: OrderStatus.CANCELLED,
    });
  }

  /**
   * Cambia el estado SOLO si el pedido sigue pendiente, en una única
   * operación atómica de Mongo (buscar + actualizar a la vez). Si dos
   * procesos lo intentan a la vez, Mongo garantiza que solo uno encuentra
   * el pedido "pendiente"; el otro recibe null.
   */
  private async transitionFromPending(
    orderId: string,
    changes: Partial<Pick<OrderDocument, 'status' | 'paidAt'>>,
  ): Promise<Order | null> {
    if (!isValidObjectId(orderId)) return null;
    const doc = await this.orderModel
      .findOneAndUpdate(
        { _id: orderId, status: OrderStatus.PENDING_PAYMENT },
        { $set: changes },
        { new: true },
      )
      .exec();
    return doc ? OrderMapper.toDomain(doc) : null;
  }
}
