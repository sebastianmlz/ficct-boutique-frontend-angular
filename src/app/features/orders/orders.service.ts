import { Injectable, inject } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { Order, Sale } from '../../shared/models';

const SALE_FIELDS = gql`
  fragment SaleFields on Sale {
    id
    status
    subtotal
    tax
    total
    currency
    confirmedAt
    createdAt
    branch {
      id
      code
      name
    }
    items {
      id
      variantId
      quantity
      unitPrice
      lineTotal
    }
  }
`;

const SALES_QUERY = gql`
  query OrdersSales($status: String, $limit: Int, $offset: Int) {
    sales(status: $status, limit: $limit, offset: $offset) {
      ...SaleFields
    }
  }
  ${SALE_FIELDS}
`;

const SALE_QUERY = gql`
  query OrdersSaleDetail($id: UUID!) {
    sale(id: $id) {
      ...SaleFields
    }
  }
  ${SALE_FIELDS}
`;

const ORDERS_QUERY = gql`
  query OrdersList($status: String, $limit: Int, $offset: Int) {
    orders(status: $status, limit: $limit, offset: $offset) {
      id
      code
      status
      notes
      createdAt
      sale {
        id
        status
        total
        currency
        createdAt
        branch {
          id
          code
          name
        }
      }
    }
  }
`;

const ORDER_QUERY = gql`
  query OrdersOrderDetail($id: UUID!) {
    order(id: $id) {
      id
      code
      status
      notes
      createdAt
      sale {
        ...SaleFields
      }
    }
  }
  ${SALE_FIELDS}
`;

const CONFIRM_SALE = gql`
  mutation OrdersConfirmSale($saleId: UUID!) {
    confirmSale(saleId: $saleId) {
      id
      code
      status
      createdAt
      sale {
        id
        status
        total
        currency
      }
    }
  }
`;

/**
 * GraphQL access for the CU06 order-orchestration screen. Wraps the Go core
 * `sales`/`orders` queries and the `confirmSale` mutation (Sale pending ->
 * confirmed, which creates the Order and enqueues the signed invoice webhook).
 */
@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly apollo = inject(Apollo);

  async listSales(status?: string, limit = 50, offset = 0): Promise<Sale[]> {
    const r = await firstValueFrom(
      this.apollo.query<{ sales: Sale[] }>({
        query: SALES_QUERY,
        variables: { status: status ?? null, limit, offset },
        fetchPolicy: 'network-only',
      }),
    );
    return r.data?.sales ?? [];
  }

  async listOrders(status?: string, limit = 50, offset = 0): Promise<Order[]> {
    const r = await firstValueFrom(
      this.apollo.query<{ orders: Order[] }>({
        query: ORDERS_QUERY,
        variables: { status: status ?? null, limit, offset },
        fetchPolicy: 'network-only',
      }),
    );
    return r.data?.orders ?? [];
  }

  async getSale(id: string): Promise<Sale | null> {
    const r = await firstValueFrom(
      this.apollo.query<{ sale: Sale | null }>({ query: SALE_QUERY, variables: { id }, fetchPolicy: 'network-only' }),
    );
    return r.data?.sale ?? null;
  }

  async getOrder(id: string): Promise<Order | null> {
    const r = await firstValueFrom(
      this.apollo.query<{ order: Order | null }>({ query: ORDER_QUERY, variables: { id }, fetchPolicy: 'network-only' }),
    );
    return r.data?.order ?? null;
  }

  async confirmSale(saleId: string): Promise<Order> {
    const r = await firstValueFrom(
      this.apollo.mutate<{ confirmSale: Order }>({ mutation: CONFIRM_SALE, variables: { saleId } }),
    );
    if (!r.data?.confirmSale) {
      throw new Error('La confirmación no devolvió un pedido');
    }
    return r.data.confirmSale;
  }
}
