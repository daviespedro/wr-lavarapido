export type VehicleStatus = 'Aguardando' | 'Em lavagem' | 'Finalizado';
export interface Client { phone: string; name: string; model: string; plate: string; visits: number }
export interface Vehicle { id: string; client: Client; serviceId: string; serviceName?: string; amount: number; status: VehicleStatus; arrivedAt: string; finalizedAt?: string }
export interface Transaction { id: string; date: string; description: string; type: 'entrada' | 'saida'; amount: number; createdAt: string; vehicleId?: string; serviceClient?: Client; payment?: PaymentMethod }
export interface Database { version: 2; clients: Client[]; clientVehicles?: Client[]; removedClientVehicles?: string[]; vehicles: Vehicle[]; transactions: Transaction[]; completed?: CompletedService[] }
export interface ReceptionInput { phone: string; name: string; model: string; plate: string; serviceId: string; amount: number }
export const paymentMethods = ['Dinheiro', 'PIX', 'Crédito', 'Débito'] as const;
export type PaymentMethod = typeof paymentMethods[number];
export interface CompletedService extends Vehicle { completedAt: string }
export interface RecurringExpense { id: string | number; descricao: string; valor: number; diaVencimento: number }
export type RecurringLog = string;

export interface ServiceType { id: string; name: string; suggestedAmount?: number }
