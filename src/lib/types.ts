export type VehicleStatus = 'Aguardando' | 'Em lavagem' | 'Pronto';
export interface Client { phone: string; name: string; model: string; plate: string; visits: number }
export interface Vehicle { id: string; client: Client; serviceId: string; amount: number; status: VehicleStatus; arrivedAt: string }
export interface Transaction { id: string; date: string; description: string; type: 'entrada' | 'saida'; amount: number; createdAt: string; vehicleId?: string }
export interface Database { version: 2; clients: Client[]; vehicles: Vehicle[]; transactions: Transaction[] }
export interface ReceptionInput { phone: string; name: string; model: string; plate: string; serviceId: string; amount: number }
