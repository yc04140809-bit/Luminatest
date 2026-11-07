// The playtest book, with nowhere to keep it.
//
// The same fallback as the world's, for the same reason and with a
// smaller consequence: feedback that cannot be written is feedback
// nobody collects, which is a shame, while a survey that crashes the
// app is a game nobody plays.

import type { FeedbackStore, PlaytestFeedback } from './types';

export class MemoryOnlyFeedbackStore implements FeedbackStore {
  private rows: PlaytestFeedback[] = [];

  async init(): Promise<void> {
    /* nothing to open */
  }

  async getAll(): Promise<PlaytestFeedback[]> {
    return [...this.rows];
  }

  async add(feedback: PlaytestFeedback): Promise<void> {
    if (await this.hasFeedbackForSession(feedback.playSessionId)) {
      throw new Error('This play session has already answered');
    }
    this.rows.push(feedback);
  }

  async hasFeedbackForSession(playSessionId: string): Promise<boolean> {
    return this.rows.some((row) => row.playSessionId === playSessionId);
  }

  async deleteAll(): Promise<void> {
    this.rows = [];
  }

  close(): void {
    /* nothing to close */
  }
}
