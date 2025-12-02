export class DashboardService {
  static async getCards() {
    return {
      cards: [
        { title: 'Usuários', value: 42 },
        { title: 'Pedidos', value: 17 },
        { title: 'Faturamento', value: 'R$ 12.300' }
      ]
    };
  }
}
