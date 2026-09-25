// Service for managing customer orders and history on the dashboard.
// Tracks both online self-checkout orders and Aba desk phone orders under the same account.

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'picked'
  | 'dispatched'
  | 'delivered'
  | 'cancelled';

export interface CustomerOrderItem {
  product_id: string;
  name: string;
  slug: string;
  unit: string;
  quantity: number;
  unit_price_kobo: number;
}

export interface CustomerOrderStatusHistory {
  status: OrderStatus | string;
  note: string | null;
  occurred_at: string;
}

export interface CustomerOrder {
  id: string;
  reference: string;
  channel: 'online' | 'phone';
  status: OrderStatus;
  customer_name: string;
  phone: string;
  email?: string;
  delivery_address: string;
  city: string;
  state: string;
  note?: string;
  total_kobo: number;
  delivery_fee_kobo: number;
  placed_at: string;
  items: CustomerOrderItem[];
  history: CustomerOrderStatusHistory[];
}

const STORAGE_PREFIX = 'imacals_customer_orders_';

function getStorageKey(userId?: string): string {
  return `${STORAGE_PREFIX}${userId || 'default'}`;
}

const DEFAULT_SEEDED_ORDERS: CustomerOrder[] = [
  {
    id: 'ord-seed-1',
    reference: 'IMC-849201',
    channel: 'online',
    status: 'dispatched',
    customer_name: 'Customer',
    phone: '0803 123 4567',
    email: 'customer@imacals.com',
    delivery_address: '14 Faulks Road, Opposite Ariaria International Market Gate 2',
    city: 'Aba',
    state: 'Abia State',
    note: 'Call when approaching Faulks road intersection.',
    total_kobo: 44_750_000,
    delivery_fee_kobo: 350_000,
    placed_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    items: [
      {
        product_id: 'prev-1',
        name: 'Long Grain Rice — 50kg Bag',
        slug: 'rice-50kg',
        unit: 'bag (50kg)',
        quantity: 5,
        unit_price_kobo: 8_950_000,
      },
    ],
    history: [
      {
        status: 'pending',
        note: 'Order placed online through imacals.com',
        occurred_at: new Date(Date.now() - 4 * 3600000).toISOString(),
      },
      {
        status: 'confirmed',
        note: 'Confirmed by Aba central order desk',
        occurred_at: new Date(Date.now() - 3.5 * 3600000).toISOString(),
      },
      {
        status: 'picked',
        note: 'Pallet picked and wrapped at Aba Base Warehouse (Factory Road)',
        occurred_at: new Date(Date.now() - 2.5 * 3600000).toISOString(),
      },
      {
        status: 'dispatched',
        note: 'Loaded on vehicle AB-402-ABA. Driver en route via Faulks Road',
        occurred_at: new Date(Date.now() - 1 * 3600000).toISOString(),
      },
    ],
  },
  {
    id: 'ord-seed-2',
    reference: 'IMC-723140',
    channel: 'phone',
    status: 'delivered',
    customer_name: 'Customer',
    phone: '0803 123 4567',
    email: 'customer@imacals.com',
    delivery_address: '88 Factory Road, Near Railway Crossing',
    city: 'Aba',
    state: 'Abia State',
    note: 'Phone order entered directly by Aba Order Desk.',
    total_kobo: 16_500_000,
    delivery_fee_kobo: 300_000,
    placed_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    items: [
      {
        product_id: 'prev-2',
        name: 'Vegetable Oil — 25L Keg',
        slug: 'vegetable-oil-25l',
        unit: 'keg (25L)',
        quantity: 3,
        unit_price_kobo: 5_400_000,
      },
    ],
    history: [
      {
        status: 'confirmed',
        note: 'Order placed by phone call to Aba order desk. Order verified immediately.',
        occurred_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        status: 'picked',
        note: 'Picked at Aba distribution centre',
        occurred_at: new Date(Date.now() - 2 * 86400000 + 3600000).toISOString(),
      },
      {
        status: 'dispatched',
        note: 'Dispatched with delivery rider',
        occurred_at: new Date(Date.now() - 2 * 86400000 + 7200000).toISOString(),
      },
      {
        status: 'delivered',
        note: 'Delivered and verified. Waybill signed.',
        occurred_at: new Date(Date.now() - 2 * 86400000 + 10800000).toISOString(),
      },
    ],
  },
  {
    id: 'ord-seed-3',
    reference: 'IMC-619052',
    channel: 'online',
    status: 'delivered',
    customer_name: 'Customer',
    phone: '0803 123 4567',
    delivery_address: 'Commercial Layout, Aba-Owerri Road',
    city: 'Aba',
    state: 'Abia State',
    total_kobo: 18_000_000,
    delivery_fee_kobo: 250_000,
    placed_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    items: [
      {
        product_id: 'prev-3',
        name: 'Detergent Powder — Carton of 24',
        slug: 'detergent-carton',
        unit: 'carton (24)',
        quantity: 5,
        unit_price_kobo: 3_120_000,
      },
      {
        product_id: 'prev-6',
        name: 'Malt Drink — Crate of 24',
        slug: 'malt-crate',
        unit: 'crate (24)',
        quantity: 2,
        unit_price_kobo: 1_080_000,
      },
    ],
    history: [
      {
        status: 'pending',
        note: 'Online checkout submitted',
        occurred_at: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
      {
        status: 'confirmed',
        note: 'Confirmed by Aba team',
        occurred_at: new Date(Date.now() - 7 * 86400000 + 1800000).toISOString(),
      },
      {
        status: 'delivered',
        note: 'Delivered to Commercial Layout',
        occurred_at: new Date(Date.now() - 7 * 86400000 + 14400000).toISOString(),
      },
    ],
  },
];

export const customerOrderService = {
  async listOrders(userId?: string): Promise<CustomerOrder[]> {
    const key = getStorageKey(userId);
    const stored = localStorage.getItem(key);
    if (!stored) {
      localStorage.setItem(key, JSON.stringify(DEFAULT_SEEDED_ORDERS));
      return DEFAULT_SEEDED_ORDERS;
    }
    try {
      return JSON.parse(stored) as CustomerOrder[];
    } catch {
      return [];
    }
  },

  async getOrder(idOrRef: string, userId?: string): Promise<CustomerOrder | null> {
    const list = await this.listOrders(userId);
    const query = idOrRef.trim().toUpperCase();
    return (
      list.find(
        (o) =>
          o.id.toUpperCase() === query ||
          o.reference.toUpperCase() === query,
      ) || null
    );
  },

  async recordPlacedOrder(
    order: {
      id: string;
      reference: string;
      total_kobo: number;
      delivery_fee_kobo?: number;
      status: string;
    },
    details: {
      customer_name: string;
      phone: string;
      email?: string;
      delivery_address: string;
      city: string;
      state: string;
      note?: string;
      lines: { product_id: string; quantity: number }[];
    },
    catalogProducts: { id: string; name: string; slug: string; unit: string; unit_price_kobo: number }[],
    userId?: string,
  ): Promise<CustomerOrder> {
    const list = await this.listOrders(userId);
    const newItems: CustomerOrderItem[] = details.lines.map((line) => {
      const prod = catalogProducts.find((p) => p.id === line.product_id);
      return {
        product_id: line.product_id,
        name: prod?.name || 'Product',
        slug: prod?.slug || '',
        unit: prod?.unit || 'unit',
        quantity: line.quantity,
        unit_price_kobo: prod?.unit_price_kobo || 0,
      };
    });

    const newOrder: CustomerOrder = {
      id: order.id || `ord-${Date.now()}`,
      reference: order.reference,
      channel: 'online',
      status: (order.status as OrderStatus) || 'confirmed',
      customer_name: details.customer_name,
      phone: details.phone,
      email: details.email,
      delivery_address: details.delivery_address,
      city: details.city,
      state: details.state,
      note: details.note,
      total_kobo: order.total_kobo,
      delivery_fee_kobo: order.delivery_fee_kobo || 0,
      placed_at: new Date().toISOString(),
      items: newItems,
      history: [
        {
          status: 'confirmed',
          note: 'Order confirmed and registered at Aba central distribution warehouse',
          occurred_at: new Date().toISOString(),
        },
      ],
    };

    list.unshift(newOrder);
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(list));
    return newOrder;
  },
};
