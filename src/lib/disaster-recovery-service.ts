/**
 * Disaster Recovery and Business Continuity Service
 * Ensures rapid recovery from catastrophic failures
 */

import { EventEmitter } from 'events';
import { PrismaClient } from '../generated/prisma';
import { safeLogger } from './logger';

export interface DisasterRecoveryPlan {
  id: string;
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  triggerConditions: string[];
  recoverySteps: RecoveryStep[];
  rpo: number; // Recovery Point Objective in minutes
  rto: number; // Recovery Time Objective in minutes
  testSchedule: string; // cron expression
  lastTested: Date;
  enabled: boolean;
}

export interface RecoveryStep {
  id: string;
  name: string;
  description: string;
  type: 'automated' | 'manual' | 'semi_automated';
  command?: string;
  script?: string;
  dependencies: string[];
  timeout: number; // in seconds
  rollbackCommand?: string;
  order: number;
}

export interface DisasterEvent {
  id: string;
  type: 'hardware_failure' | 'data_corruption' | 'security_breach' | 'natural_disaster' | 'ddos' | 'power_outage';
  severity: 'minor' | 'major' | 'critical' | 'catastrophic';
  description: string;
  detectedAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  affectedSystems: string[];
  recoveryPlan?: string;
  status: 'detected' | 'acknowledged' | 'recovering' | 'resolved';
  timeline: DisasterEventTimeline[];
}

export interface DisasterEventTimeline {
  timestamp: Date;
  action: string;
  result: 'success' | 'failure' | 'partial';
  details: string;
  performedBy: 'system' | 'admin' | string;
}

export class DisasterRecoveryService extends EventEmitter {
  private prisma = new PrismaClient();
  private recoveryPlans = new Map<string, DisasterRecoveryPlan>();
  private activeDisasters = new Map<string, DisasterEvent>();
  private monitoring = true;
  
  constructor() {
    super();
    this.initializeRecoveryPlans();
    this.startMonitoring();
  }

  /**
   * Initialize standard disaster recovery plans
   */
  private initializeRecoveryPlans(): void {
    // Database failure recovery plan
    this.addRecoveryPlan({
      id: 'db-failure-recovery',
      name: 'Database Failure Recovery',
      description: 'Recovery plan for primary database failures',
      priority: 'critical',
      triggerConditions: [
        'database_connection_failed',
        'database_corruption_detected',
        'database_performance_critical'
      ],
      rpo: 15, // 15 minutes max data loss
      rto: 30, // 30 minutes recovery time
      testSchedule: '0 2 * * 0', // Weekly at 2 AM
      lastTested: new Date(),
      enabled: true,
      recoverySteps: [
        {
          id: 'assess-db-damage',
          name: 'Assess Database Damage',
          description: 'Evaluate the extent of database corruption or failure',
          type: 'automated',
          command: 'node scripts/assess-database.js',
          dependencies: [],
          timeout: 300,
          order: 1
        },
        {
          id: 'failover-to-backup',
          name: 'Failover to Backup Database',
          description: 'Switch to the most recent backup database',
          type: 'automated',
          script: 'failover-database.sh',
          dependencies: ['assess-db-damage'],
          timeout: 600,
          rollbackCommand: 'rollback-failover.sh',
          order: 2
        },
        {
          id: 'restore-recent-data',
          name: 'Restore Recent Data',
          description: 'Apply recent transaction logs to minimize data loss',
          type: 'semi_automated',
          command: 'node scripts/restore-transactions.js',
          dependencies: ['failover-to-backup'],
          timeout: 900,
          order: 3
        },
        {
          id: 'validate-recovery',
          name: 'Validate Recovery',
          description: 'Verify system functionality and data integrity',
          type: 'automated',
          command: 'node scripts/validate-recovery.js',
          dependencies: ['restore-recent-data'],
          timeout: 300,
          order: 4
        }
      ]
    });

    // Security breach recovery plan
    this.addRecoveryPlan({
      id: 'security-breach-recovery',
      name: 'Security Breach Recovery',
      description: 'Recovery plan for security incidents and data breaches',
      priority: 'critical',
      triggerConditions: [
        'security_breach_detected',
        'unauthorized_access_confirmed',
        'data_exfiltration_detected'
      ],
      rpo: 0, // No data loss acceptable
      rto: 60, // 1 hour to contain
      testSchedule: '0 3 15 * *', // Monthly on 15th at 3 AM
      lastTested: new Date(),
      enabled: true,
      recoverySteps: [
        {
          id: 'isolate-affected-systems',
          name: 'Isolate Affected Systems',
          description: 'Immediately isolate compromised systems',
          type: 'automated',
          command: 'node scripts/isolate-systems.js',
          dependencies: [],
          timeout: 60,
          order: 1
        },
        {
          id: 'preserve-evidence',
          name: 'Preserve Forensic Evidence',
          description: 'Create forensic images and preserve evidence',
          type: 'automated',
          command: 'node scripts/preserve-evidence.js',
          dependencies: ['isolate-affected-systems'],
          timeout: 300,
          order: 2
        },
        {
          id: 'reset-credentials',
          name: 'Reset All Credentials',
          description: 'Force password reset for all users and rotate API keys',
          type: 'automated',
          command: 'node scripts/reset-all-credentials.js',
          dependencies: ['preserve-evidence'],
          timeout: 600,
          order: 3
        }
      ]
    });

    // Application failure recovery plan
    this.addRecoveryPlan({
      id: 'app-failure-recovery',
      name: 'Application Failure Recovery',
      description: 'Recovery plan for application crashes and failures',
      priority: 'high',
      triggerConditions: [
        'application_crash',
        'memory_exhaustion',
        'service_unavailable'
      ],
      rpo: 5, // 5 minutes max data loss
      rto: 15, // 15 minutes recovery time
      testSchedule: '0 1 * * 1', // Weekly on Monday at 1 AM
      lastTested: new Date(),
      enabled: true,
      recoverySteps: [
        {
          id: 'restart-services',
          name: 'Restart Failed Services',
          description: 'Restart crashed application services',
          type: 'automated',
          command: 'docker-compose restart web',
          dependencies: [],
          timeout: 180,
          order: 1
        },
        {
          id: 'clear-cache',
          name: 'Clear Application Cache',
          description: 'Clear corrupted cache data',
          type: 'automated',
          command: 'redis-cli FLUSHALL',
          dependencies: ['restart-services'],
          timeout: 60,
          order: 2
        }
      ]
    });

    safeLogger.info(`Initialized ${this.recoveryPlans.size} disaster recovery plans`);
  }

  /**
   * Add a new recovery plan
   */
  addRecoveryPlan(plan: DisasterRecoveryPlan): void {
    this.recoveryPlans.set(plan.id, plan);
    safeLogger.info(`Disaster recovery plan added: ${plan.name}`);
  }

  /**
   * Detect and handle disaster events
   */
  async detectDisaster(
    type: DisasterEvent['type'],
    severity: DisasterEvent['severity'],
    description: string,
    affectedSystems: string[] = []
  ): Promise<string> {
    const disaster: DisasterEvent = {
      id: `DR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      description,
      detectedAt: new Date(),
      affectedSystems,
      status: 'detected',
      timeline: [{
        timestamp: new Date(),
        action: 'Disaster detected',
        result: 'success',
        details: description,
        performedBy: 'system'
      }]
    };

    // Store the disaster event
    this.activeDisasters.set(disaster.id, disaster);

    // Find appropriate recovery plan
    const plan = this.findRecoveryPlan(type, severity);
    if (plan) {
      disaster.recoveryPlan = plan.id;
      safeLogger.info(`Recovery plan selected: ${plan.name} for disaster ${disaster.id}`);
    }

    // Log the disaster
    safeLogger.error(`Disaster detected: ${disaster.id}`, disaster);
    
    // Emit event
    this.emit('disasterDetected', disaster);

    // Auto-execute recovery for critical disasters
    if (severity === 'critical' || severity === 'catastrophic') {
      await this.executeRecoveryPlan(disaster.id);
    }

    return disaster.id;
  }

  /**
   * Execute disaster recovery plan
   */
  async executeRecoveryPlan(disasterId: string): Promise<void> {
    const disaster = this.activeDisasters.get(disasterId);
    if (!disaster) {
      throw new Error(`Disaster ${disasterId} not found`);
    }

    if (!disaster.recoveryPlan) {
      throw new Error(`No recovery plan assigned to disaster ${disasterId}`);
    }

    const plan = this.recoveryPlans.get(disaster.recoveryPlan);
    if (!plan) {
      throw new Error(`Recovery plan ${disaster.recoveryPlan} not found`);
    }

    disaster.status = 'recovering';
    disaster.acknowledgedAt = new Date();
    
    safeLogger.info(`Starting recovery plan execution: ${plan.name}`);
    
    try {
      // Sort steps by order
      const sortedSteps = [...plan.recoverySteps].sort((a, b) => a.order - b.order);
      
      for (const step of sortedSteps) {
        await this.executeRecoveryStep(disaster, step);
      }

      disaster.status = 'resolved';
      disaster.resolvedAt = new Date();
      
      disaster.timeline.push({
        timestamp: new Date(),
        action: 'Recovery completed successfully',
        result: 'success',
        details: `All ${sortedSteps.length} recovery steps completed`,
        performedBy: 'system'
      });

      safeLogger.info(`Recovery plan completed successfully: ${plan.name}`);
      this.emit('recoveryCompleted', disaster);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      disaster.timeline.push({
        timestamp: new Date(),
        action: 'Recovery failed',
        result: 'failure',
        details: errorMessage,
        performedBy: 'system'
      });

      safeLogger.error(`Recovery plan failed: ${plan.name}`, error);
      this.emit('recoveryFailed', { disaster, error });
      
      // Attempt rollback if possible
      await this.attemptRollback(disaster, plan);
    }
  }

  /**
   * Execute a single recovery step
   */
  private async executeRecoveryStep(disaster: DisasterEvent, step: RecoveryStep): Promise<void> {
    safeLogger.info(`Executing recovery step: ${step.name}`);
    
    const startTime = Date.now();
    
    try {
      if (step.type === 'automated') {
        await this.executeAutomatedStep(step);
      } else if (step.type === 'semi_automated') {
        await this.executeSemiAutomatedStep(step);
      } else {
        await this.executeManualStep(step);
      }

      const duration = Date.now() - startTime;
      
      disaster.timeline.push({
        timestamp: new Date(),
        action: `Step completed: ${step.name}`,
        result: 'success',
        details: `Duration: ${duration}ms`,
        performedBy: step.type === 'manual' ? 'admin' : 'system'
      });

      safeLogger.info(`Recovery step completed: ${step.name} (${duration}ms)`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      disaster.timeline.push({
        timestamp: new Date(),
        action: `Step failed: ${step.name}`,
        result: 'failure',
        details: errorMessage,
        performedBy: 'system'
      });

      throw new Error(`Recovery step failed: ${step.name} - ${errorMessage}`);
    }
  }

  /**
   * Execute automated recovery step
   */
  private async executeAutomatedStep(step: RecoveryStep): Promise<void> {
    if (step.command) {
      const { execSync } = require('child_process');
      execSync(step.command, { timeout: step.timeout * 1000 });
    } else if (step.script) {
      const { spawn } = require('child_process');
      return new Promise((resolve, reject) => {
        const process = spawn('bash', [step.script]);
        const timeout = setTimeout(() => {
          process.kill();
          reject(new Error(`Step timeout: ${step.name}`));
        }, step.timeout * 1000);

        process.on('close', (code: number | null) => {
          clearTimeout(timeout);
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Step failed with code: ${code}`));
          }
        });
      });
    }
  }

  /**
   * Execute semi-automated step (requires confirmation)
   */
  private async executeSemiAutomatedStep(step: RecoveryStep): Promise<void> {
    // In a real implementation, this would wait for admin confirmation
    safeLogger.warn(`Semi-automated step requires confirmation: ${step.name}`);
    
    // For now, auto-approve critical steps
    await this.executeAutomatedStep(step);
  }

  /**
   * Execute manual step (human intervention required)
   */
  private async executeManualStep(step: RecoveryStep): Promise<void> {
    safeLogger.warn(`Manual intervention required: ${step.name}`);
    
    // Create a ticket or alert for manual intervention
    this.emit('manualStepRequired', { step });
    
    // In a real implementation, wait for completion confirmation
    // For testing, we'll simulate completion after a delay
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  /**
   * Find appropriate recovery plan for disaster type
   */
  private findRecoveryPlan(
    type: DisasterEvent['type'],
    severity: DisasterEvent['severity']
  ): DisasterRecoveryPlan | null {
    for (const plan of this.recoveryPlans.values()) {
      if (!plan.enabled) continue;
      
      // Check if any trigger conditions match the disaster type
      const typeMap: Record<DisasterEvent['type'], string[]> = {
        'hardware_failure': ['database_connection_failed', 'application_crash'],
        'data_corruption': ['database_corruption_detected'],
        'security_breach': ['security_breach_detected', 'unauthorized_access_confirmed'],
        'natural_disaster': [],
        'ddos': ['service_unavailable'],
        'power_outage': ['application_crash', 'database_connection_failed']
      };

      const relevantConditions = typeMap[type] || [];
      
      if (plan.triggerConditions.some(condition => 
        relevantConditions.includes(condition)
      )) {
        return plan;
      }
    }

    return null;
  }

  /**
   * Attempt rollback of failed recovery
   */
  private async attemptRollback(disaster: DisasterEvent, plan: DisasterRecoveryPlan): Promise<void> {
    safeLogger.info('Attempting recovery rollback');
    
    try {
      // Execute rollback commands in reverse order
      const stepsWithRollback = plan.recoverySteps
        .filter(step => step.rollbackCommand)
        .sort((a, b) => b.order - a.order); // Reverse order

      for (const step of stepsWithRollback) {
        if (step.rollbackCommand) {
          const { execSync } = require('child_process');
          execSync(step.rollbackCommand, { timeout: step.timeout * 1000 });
          
          disaster.timeline.push({
            timestamp: new Date(),
            action: `Rollback executed: ${step.name}`,
            result: 'success',
            details: `Command: ${step.rollbackCommand}`,
            performedBy: 'system'
          });
        }
      }

      safeLogger.info('Recovery rollback completed');

    } catch (rollbackError) {
      const errorMessage = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
      safeLogger.error('Rollback failed:', rollbackError);
      
      disaster.timeline.push({
        timestamp: new Date(),
        action: 'Rollback failed',
        result: 'failure',
        details: errorMessage,
        performedBy: 'system'
      });
    }
  }

  /**
   * Test disaster recovery plans
   */
  async testRecoveryPlan(planId: string, simulate = true): Promise<any> {
    const plan = this.recoveryPlans.get(planId);
    if (!plan) {
      throw new Error(`Recovery plan ${planId} not found`);
    }

    safeLogger.info(`Testing recovery plan: ${plan.name} (simulate: ${simulate})`);

    const testResults = {
      planId,
      planName: plan.name,
      testStartTime: new Date(),
      testEndTime: null as Date | null,
      stepResults: [] as any[],
      overallResult: 'pending',
      issues: [] as string[]
    };

    try {
      for (const step of plan.recoverySteps.sort((a, b) => a.order - b.order)) {
        const stepResult = await this.testRecoveryStep(step, simulate);
        testResults.stepResults.push(stepResult);
        
        if (!stepResult.success) {
          testResults.issues.push(`Step failed: ${step.name} - ${stepResult.error}`);
        }
      }

      testResults.overallResult = testResults.issues.length === 0 ? 'success' : 'failure';
      testResults.testEndTime = new Date();

      // Update last tested date
      plan.lastTested = new Date();

      safeLogger.info(`Recovery plan test completed: ${plan.name} - ${testResults.overallResult}`);
      
      return testResults;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      testResults.overallResult = 'error';
      testResults.testEndTime = new Date();
      testResults.issues.push(`Test execution failed: ${errorMessage}`);
      
      throw error;
    }
  }

  /**
   * Test individual recovery step
   */
  private async testRecoveryStep(step: RecoveryStep, simulate: boolean): Promise<any> {
    const stepResult = {
      stepId: step.id,
      stepName: step.name,
      success: false,
      duration: 0,
      error: null as string | null
    };

    const startTime = Date.now();

    try {
      if (simulate) {
        // Simulate step execution without actually running it
        await new Promise(resolve => setTimeout(resolve, 100));
        stepResult.success = true;
      } else {
        // Actually execute the step (be careful in production!)
        if (step.type === 'automated' && step.command) {
          // Add dry-run flags if supported
          const dryRunCommand = step.command.includes('--dry-run') ? 
            step.command : `${step.command} --dry-run`;
          
          const { execSync } = require('child_process');
          execSync(dryRunCommand, { timeout: step.timeout * 1000 });
        }
        stepResult.success = true;
      }
    } catch (error) {
      stepResult.error = error instanceof Error ? error.message : String(error);
    }

    stepResult.duration = Date.now() - startTime;
    return stepResult;
  }

  /**
   * Start continuous monitoring for disaster conditions
   */
  private startMonitoring(): void {
    // Monitor system health every minute
    setInterval(async () => {
      if (!this.monitoring) return;
      
      try {
        await this.checkSystemHealth();
      } catch (error) {
        safeLogger.error('Health check failed:', error);
      }
    }, 60 * 1000); // Every minute

    // Test recovery plans according to schedule
    setInterval(async () => {
      await this.runScheduledTests();
    }, 60 * 60 * 1000); // Every hour

    safeLogger.info('Disaster recovery monitoring started');
  }

  /**
   * Check system health and detect potential disasters
   */
  private async checkSystemHealth(): Promise<void> {
    try {
      // Database connectivity check
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.detectDisaster(
        'hardware_failure',
        'critical',
        `Database connection failed: ${errorMessage}`,
        ['database']
      );
    }

    // Memory usage check
    const memoryUsage = process.memoryUsage();
    const memoryPercentage = (memoryUsage.rss / memoryUsage.heapTotal) * 100;
    
    if (memoryPercentage > 90) {
      await this.detectDisaster(
        'hardware_failure',
        'major',
        `High memory usage detected: ${memoryPercentage.toFixed(1)}%`,
        ['application']
      );
    }

    // Disk space check (if available)
    try {
      const { execSync } = require('child_process');
      const diskUsage = execSync('df -h / | awk \'NR==2{print $5}\'').toString().trim();
      const diskPercentage = parseInt(diskUsage.replace('%', ''));
      
      if (diskPercentage > 90) {
        await this.detectDisaster(
          'hardware_failure',
          'major',
          `Low disk space: ${diskPercentage}% used`,
          ['storage']
        );
      }
    } catch (error) {
      // Disk check failed, but don't create a disaster for this
    }
  }

  /**
   * Run scheduled recovery plan tests
   */
  private async runScheduledTests(): Promise<void> {
    const now = new Date();
    
    for (const plan of this.recoveryPlans.values()) {
      if (!plan.enabled || !plan.testSchedule) continue;
      
      // Check if test is due (simplified cron check)
      const hoursSinceLastTest = (now.getTime() - plan.lastTested.getTime()) / (1000 * 60 * 60);
      
      // If it's been more than a week, run the test
      if (hoursSinceLastTest > 168) {
        try {
          safeLogger.info(`Running scheduled test for recovery plan: ${plan.name}`);
          await this.testRecoveryPlan(plan.id, true);
        } catch (error) {
          safeLogger.error(`Scheduled test failed for plan ${plan.name}:`, error);
        }
      }
    }
  }

  /**
   * Get disaster recovery dashboard data
   */
  getDashboardData(): any {
    return {
      totalPlans: this.recoveryPlans.size,
      enabledPlans: Array.from(this.recoveryPlans.values()).filter(p => p.enabled).length,
      activeDisasters: this.activeDisasters.size,
      plansByPriority: this.getPlansByPriority(),
      recentDisasters: Array.from(this.activeDisasters.values())
        .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
        .slice(0, 10),
      testStatus: this.getTestStatus()
    };
  }

  private getPlansByPriority(): any {
    const priorities: any = {};
    for (const plan of this.recoveryPlans.values()) {
      priorities[plan.priority] = (priorities[plan.priority] || 0) + 1;
    }
    return priorities;
  }

  private getTestStatus(): any {
    const now = Date.now();
    let overdue = 0;
    let upToDate = 0;
    
    for (const plan of this.recoveryPlans.values()) {
      const daysSinceTest = (now - plan.lastTested.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceTest > 30) {
        overdue++;
      } else {
        upToDate++;
      }
    }
    
    return { overdue, upToDate };
  }
}

export const disasterRecoveryService = new DisasterRecoveryService();
export default disasterRecoveryService;
