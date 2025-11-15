/**
 * Simple validation test for refactored services
 * Just imports and checks if services exist
 */
describe('Refactored Services - Basic Import Test', () => {
  it('should import all refactored services without errors', async () => {
    // Test basic imports
    const { analyticsService } = await import('../../../src/services/analyticsService');
    const { eventManagementService } = await import('../../../src/services/eventManagementService');
    const { systemLogsService } = await import('../../../src/services/systemLogsService');
    const { adminService } = await import('../../../src/services/adminService');

    // Check that services are defined
    expect(analyticsService).toBeDefined();
    expect(eventManagementService).toBeDefined();
    expect(systemLogsService).toBeDefined();
    expect(adminService).toBeDefined();

    // Check that services have expected methods
    expect(typeof analyticsService.getDashboardStatistics).toBe('function');
    expect(typeof eventManagementService.getEventManagementStats).toBe('function');
    expect(typeof systemLogsService.logSystemActivity).toBe('function');
    expect(typeof adminService.getDashboardStatistics).toBe('function');
  });

  it('should verify service delegation in AdminService', async () => {
    const { adminService } = await import('../../../src/services/adminService');
    
    // Check that AdminService has delegated methods
    expect(typeof adminService.getDashboardStatistics).toBe('function');
    expect(typeof adminService.getSalesStatistics).toBe('function');
    expect(typeof adminService.getUserManagementStats).toBe('function');
    expect(typeof adminService.getEventManagementStats).toBe('function');

    // Check that AdminService has core admin methods
    expect(typeof adminService.blockUser).toBe('function');
    expect(typeof adminService.unblockUser).toBe('function');
    expect(typeof adminService.updateUserRole).toBe('function');
    expect(typeof adminService.getUserDetails).toBe('function');
  });

  it('should verify AnalyticsService methods', async () => {
    const { analyticsService } = await import('../../../src/services/analyticsService');
    
    expect(typeof analyticsService.getDashboardStatistics).toBe('function');
    expect(typeof analyticsService.getSalesStatistics).toBe('function');
    expect(typeof analyticsService.getUserAnalytics).toBe('function');
    expect(typeof analyticsService.getEventAnalytics).toBe('function');
    expect(typeof analyticsService.getRevenueAnalytics).toBe('function');
  });

  it('should verify EventManagementService methods', async () => {
    const { eventManagementService } = await import('../../../src/services/eventManagementService');
    
    expect(typeof eventManagementService.getEventManagementStats).toBe('function');
    expect(typeof eventManagementService.toggleEventPublished).toBe('function');
    expect(typeof eventManagementService.cancelEvent).toBe('function');
    expect(typeof eventManagementService.getEventDetails).toBe('function');
    expect(typeof eventManagementService.updateEvent).toBe('function');
    expect(typeof eventManagementService.getEvents).toBe('function');
  });

  it('should verify SystemLogsService methods', async () => {
    const { systemLogsService } = await import('../../../src/services/systemLogsService');
    
    expect(typeof systemLogsService.logSystemActivity).toBe('function');
    expect(typeof systemLogsService.getSystemLogs).toBe('function');
    expect(typeof systemLogsService.getSystemActivityStats).toBe('function');
    expect(typeof systemLogsService.logSecurityEvent).toBe('function');
    expect(typeof systemLogsService.logUserAction).toBe('function');
    expect(typeof systemLogsService.logAdminAction).toBe('function');
    expect(typeof systemLogsService.cleanupOldLogs).toBe('function');
    expect(typeof systemLogsService.exportLogs).toBe('function');
  });
});
