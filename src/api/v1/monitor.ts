import { Router, Request, Response } from 'express';
import { anchorMonitor } from '../../services/feebump/monitor';
import { logger } from '../../utils/logger';

const router = Router();

// Start monitoring
router.post('/start', async (req: Request, res: Response) => {
  try {
    const intervalMs = parseInt((req.body?.intervalMs || '10000').toString());
    
    logger.info('Attempting to start monitor', { intervalMs });
    await anchorMonitor.startMonitoring(intervalMs);
    
    res.json({
      success: true,
      message: 'Monitoring started',
      intervalMs,
    });
  } catch (error: any) {
    logger.error('Error starting monitor', { 
      error: error.message,
      stack: error.stack 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to start monitoring',
      details: error.message,
    });
  }
});

// Stop monitoring
router.post('/stop', (req: Request, res: Response) => {
  try {
    anchorMonitor.stopMonitoring();
    
    res.json({
      success: true,
      message: 'Monitoring stopped',
    });
  } catch (error: any) {
    logger.error('Error stopping monitor', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to stop monitoring',
    });
  }
});

// Get monitoring status and stats
router.get('/status', (req: Request, res: Response) => {
  try {
    const stats = anchorMonitor.getStats();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Error getting monitor status', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get status',
    });
  }
});

export default router;
