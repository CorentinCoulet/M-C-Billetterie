/**
 * Service de gestion des utilisateurs
 * Extrait de AdminService pour respecter le principe de responsabilité unique
 */

import prisma from '@/lib/prisma';
import { User } from '../generated/prisma';

export class UserManagementService {
  /**
   * Obtenir les statistiques de gestion des utilisateurs
   */
  async getUserManagementStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    blockedUsers: number;
    usersByRole: { role: string; count: number }[];
    newUsersOverTime: { date: string; count: number }[];
  }> {
    const [
      totalUsers,
      blockedUsers,
      usersByRole,
      newUsersData
    ] = await Promise.all([
      prisma.user.count(),
      prisma.blockedUser.count(),
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
      prisma.user.findMany({
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1000, // Derniers 1000 utilisateurs
      }),
    ]);

    const newUsersOverTime = this.processNewUsersOverTime(newUsersData);

    return {
      totalUsers,
      activeUsers: totalUsers - blockedUsers,
      blockedUsers,
      usersByRole: usersByRole.map(item => ({
        role: item.role,
        count: item._count.id
      })),
      newUsersOverTime
    };
  }

  /**
   * Bloquer un utilisateur
   */
  async blockUser(userId: string, reason: string): Promise<User> {
    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Créer l'entrée de blocage
    await prisma.blockedUser.create({
      data: {
        userId,
        reason,
        blockedAt: new Date(),
      },
    });

    return user;
  }

  /**
   * Débloquer un utilisateur
   */
  async unblockUser(userId: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Supprimer l'entrée de blocage
    await prisma.blockedUser.deleteMany({
      where: { userId },
    });

    return user;
  }

  /**
   * Changer le rôle d'un utilisateur
   */
  async changeUserRole(userId: string, role: 'USER' | 'ADMIN' | 'ORGANIZER'): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  /**
   * Traiter les nouveaux utilisateurs au fil du temps
   */
  private processNewUsersOverTime(userData: { createdAt: Date }[]): { date: string; count: number }[] {
    const last12Months = this.getLast12MonthsLabels();
    const usersByMonth: Record<string, number> = {};

    // Initialiser tous les mois avec 0
    last12Months.forEach(month => {
      usersByMonth[month] = 0;
    });

    // Compter les utilisateurs par mois
    userData.forEach(user => {
      const date = user.createdAt;
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (usersByMonth[monthYear] !== undefined) {
        usersByMonth[monthYear]++;
      }
    });

    // Convertir en format de tableau
    return last12Months.map(month => ({
      date: month,
      count: usersByMonth[month]
    }));
  }

  /**
   * Obtenir les étiquettes des 12 derniers mois
   */
  private getLast12MonthsLabels(): string[] {
    const months = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }
    
    return months;
  }
}

// Export singleton
const userManagementService = new UserManagementService();
export default userManagementService;
