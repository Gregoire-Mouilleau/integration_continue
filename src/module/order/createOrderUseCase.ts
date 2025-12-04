import { Order } from './Order';
import { OrderRepository } from './orderRepository';

export class CreateOrderUseCase {
    constructor(private orderRepository: OrderRepository) {}

    async execute(productIds: number[], totalPrice: number): Promise<Order> {
        const order = new Order(productIds, totalPrice);

        const orderSaved = await this.orderRepository.save(order);

        return orderSaved;
    }
}