// Service for managing customer delivery addresses.
// Stored per authenticated user so repeat customers can select addresses at checkout and on their dashboard.

export interface CustomerAddress {
  id: string;
  user_id?: string;
  label: string; // e.g. "Main Aba Store", "Warehouse Annex", "Residential"
  recipient_name: string;
  phone: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  is_default: boolean;
  instructions?: string;
  created_at: string;
}

export type CreateAddressInput = Omit<CustomerAddress, 'id' | 'created_at'>;
export type UpdateAddressInput = Partial<Omit<CustomerAddress, 'id' | 'created_at'>>;

const STORAGE_PREFIX = 'imacals_addresses_';

function getStorageKey(userId?: string): string {
  return `${STORAGE_PREFIX}${userId || 'guest'}`;
}

const DEFAULT_SEEDED_ADDRESSES: CustomerAddress[] = [
  {
    id: 'addr-seed-1',
    label: 'Main Commercial Store',
    recipient_name: 'Customer',
    phone: '0803 123 4567',
    street: '14 Faulks Road',
    landmark: 'Opposite Ariaria International Market Gate 2',
    city: 'Aba',
    state: 'Abia State',
    is_default: true,
    instructions: 'Call on arrival. Goods can be offloaded at the rear loading bay.',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'addr-seed-2',
    label: 'Depot Annex',
    recipient_name: 'Customer Warehouse Desk',
    phone: '0803 987 6543',
    street: '88 Factory Road',
    landmark: 'Near Railway Crossing / Milverton Junction',
    city: 'Aba',
    state: 'Abia State',
    is_default: false,
    instructions: 'Open Mon–Sat 8am–5pm. Ask for the store manager.',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
];

export const customerAddressService = {
  async listAddresses(userId?: string): Promise<CustomerAddress[]> {
    const key = getStorageKey(userId);
    const stored = localStorage.getItem(key);
    if (!stored) {
      // Seed default addresses for demo/initial account experience
      const seeded = DEFAULT_SEEDED_ADDRESSES.map((a) => ({
        ...a,
        user_id: userId,
      }));
      localStorage.setItem(key, JSON.stringify(seeded));
      return seeded;
    }
    try {
      return JSON.parse(stored) as CustomerAddress[];
    } catch {
      return [];
    }
  },

  async getAddress(id: string, userId?: string): Promise<CustomerAddress | null> {
    const list = await this.listAddresses(userId);
    return list.find((a) => a.id === id) || null;
  },

  async getDefaultAddress(userId?: string): Promise<CustomerAddress | null> {
    const list = await this.listAddresses(userId);
    return list.find((a) => a.is_default) || list[0] || null;
  },

  async createAddress(input: CreateAddressInput, userId?: string): Promise<CustomerAddress> {
    const list = await this.listAddresses(userId);
    const newAddress: CustomerAddress = {
      ...input,
      id: `addr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      created_at: new Date().toISOString(),
      is_default: input.is_default || list.length === 0,
    };

    // If marked as default, unset existing defaults
    let updatedList = list;
    if (newAddress.is_default) {
      updatedList = list.map((a) => ({ ...a, is_default: false }));
    }

    updatedList.unshift(newAddress);
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(updatedList));
    return newAddress;
  },

  async updateAddress(id: string, input: UpdateAddressInput, userId?: string): Promise<CustomerAddress> {
    const list = await this.listAddresses(userId);
    const index = list.findIndex((a) => a.id === id);
    if (index === -1) throw new Error('Address not found');

    let updatedList = list;
    if (input.is_default) {
      updatedList = list.map((a) => ({ ...a, is_default: false }));
    }

    const updatedAddress: CustomerAddress = {
      ...updatedList[index],
      ...input,
    };

    updatedList[index] = updatedAddress;
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(updatedList));
    return updatedAddress;
  },

  async setDefaultAddress(id: string, userId?: string): Promise<CustomerAddress> {
    return this.updateAddress(id, { is_default: true }, userId);
  },

  async deleteAddress(id: string, userId?: string): Promise<void> {
    const list = await this.listAddresses(userId);
    const filtered = list.filter((a) => a.id !== id);
    // If the deleted address was default and other addresses exist, set the first as default
    if (filtered.length > 0 && !filtered.some((a) => a.is_default)) {
      filtered[0].is_default = true;
    }
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(filtered));
  },
};
