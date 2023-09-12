import Queue from 'bull';
import { parentLogger } from '../lib/logger';
import { processTags } from './jobs/processTags';
import { conjure } from './jobs/conjure';
import { completeSession } from './jobs/completeSession';
const logger = parentLogger.getSubLogger();

const config = {
  redis: {
    port: 6379,
    host: process.env.REDIS_ENDPOINT,
    password: process.env.REDIS_PASSWORD,
  },
};

export interface ProcessTagsEvent {
  conjurationIds: number[];
}

export const processTagsQueue = new Queue<ProcessTagsEvent>(
  'process-tags',
  config
);

processTagsQueue.process(async (job, done) => {
  logger.info('Processing tags job', job.data);

  try {
    await processTags(job.data.conjurationIds);
  } catch (err) {
    logger.error('Error processing generated image job!', err);
  }

  done();
});

export interface ConjureEvent {
  conjurationRequestId: number;
  campaignId: number;
  generatorCode: string;
  count: number;
  arg?: string | undefined;
}

export const conjureQueue = new Queue<ConjureEvent>('conjuring', config);

conjureQueue.process(async (job, done) => {
  logger.info('Processing conjure job', job.data);

  const jobPromises = [];

  for (let i = 0; i < job.data.count; i++) {
    const promise = conjure(job.data);
    jobPromises.push(promise);
  }

  try {
    await Promise.all(jobPromises);
    logger.info('Completed processing conjure job', job.data);
    done();
  } catch (err) {
    logger.error('Error processing conjure job!', err);
    done(new Error('Error processing conjure job!'));
  }
});

export interface CompleteSessionEvent {
  sessionId: number;
}

export const completeSessionQueue = new Queue<CompleteSessionEvent>(
  'complete-session',
  config
);

completeSessionQueue.process(async (job, done) => {
  logger.info('Processing complete session job', job.data);

  try {
    await completeSession(job.data);
    logger.info('Completed processing conjure job', job.data);
    done();
  } catch (err) {
    logger.error('Error processing conjure job!', err);
    done(new Error('Error processing conjure job!'));
  }
});
