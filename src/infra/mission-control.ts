/**
 * Mission Control integration for OpenClaw agents
 * Polls MC API for messages, tasks, and notifications
 */

import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("gateway/mission-control");

export interface MissionControlConfig {
  url: string;
  enabled: boolean;
  agentId: string;
  pollTimeoutMs?: number;
}

export interface NotificationSummary {
  unreadMessages: number;
  pendingTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
}

export interface MCMessage {
  id: number;
  subject: string;
  body: string;
  fromAgentId: string;
  toAgentId: string;
  type: number;
  isRead: boolean;
  createdAt: string;
}

export interface MCTask {
  id: number;
  title: string;
  description?: string;
  status: number; // 0=pending, 1=in_progress, 4=completed
  assigneeId?: string;
  priority: number;
}

/**
 * Fetch notifications summary for an agent
 */
export async function fetchNotifications(
  config: MissionControlConfig
): Promise<NotificationSummary | null> {
  if (!config.enabled) return null;

  try {
    const url = `${config.url}/api/agents/${config.agentId}/notifications`;
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(config.pollTimeoutMs ?? 5000),
    });

    if (!response.ok) {
      log.warn("MC notifications fetch failed", { status: response.status, agentId: config.agentId });
      return null;
    }

    return await response.json();
  } catch (error) {
    log.warn("MC notifications fetch error", {
      error: error instanceof Error ? error.message : String(error),
      agentId: config.agentId,
    });
    return null;
  }
}

/**
 * Fetch unread messages for an agent
 */
export async function fetchUnreadMessages(
  config: MissionControlConfig
): Promise<MCMessage[]> {
  if (!config.enabled) return [];

  try {
    const url = `${config.url}/api/agents/${config.agentId}/messages/unread`;
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(config.pollTimeoutMs ?? 5000),
    });

    if (!response.ok) {
      log.warn("MC messages fetch failed", { status: response.status, agentId: config.agentId });
      return [];
    }

    return await response.json();
  } catch (error) {
    log.warn("MC messages fetch error", {
      error: error instanceof Error ? error.message : String(error),
      agentId: config.agentId,
    });
    return [];
  }
}

/**
 * Fetch pending tasks for an agent
 */
export async function fetchPendingTasks(
  config: MissionControlConfig
): Promise<MCTask[]> {
  if (!config.enabled) return [];

  try {
    const url = `${config.url}/api/tasks?assigneeId=${config.agentId}&status=0`;
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(config.pollTimeoutMs ?? 5000),
    });

    if (!response.ok) {
      log.warn("MC tasks fetch failed", { status: response.status, agentId: config.agentId });
      return [];
    }

    return await response.json();
  } catch (error) {
    log.warn("MC tasks fetch error", {
      error: error instanceof Error ? error.message : String(error),
      agentId: config.agentId,
    });
    return [];
  }
}

/**
 * Mark a message as read
 */
export async function markMessageAsRead(config: MissionControlConfig, messageId: number): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = `${config.url}/api/messages/${messageId}/read`;
    const response = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(config.pollTimeoutMs ?? 5000),
    });

    if (!response.ok) {
      log.warn("MC mark read failed", { status: response.status, messageId });
      return false;
    }

    return true;
  } catch (error) {
    log.warn("MC mark read error", {
      error: error instanceof Error ? error.message : String(error),
      messageId,
    });
    return false;
  }
}

/**
 * Send a message via Mission Control
 */
export async function sendMessage(
  config: MissionControlConfig,
  toAgentId: string,
  subject: string,
  body: string,
  type: number = 2
): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = `${config.url}/api/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fromAgentId: config.agentId,
        toAgentId,
        subject,
        body,
        type,
      }),
      signal: AbortSignal.timeout(config.pollTimeoutMs ?? 5000),
    });

    if (!response.ok) {
      log.warn("MC send message failed", { status: response.status, toAgentId });
      return false;
    }

    return true;
  } catch (error) {
    log.warn("MC send message error", {
      error: error instanceof Error ? error.message : String(error),
      toAgentId,
    });
    return false;
  }
}

/**
 * Claim a task (set to in_progress)
 */
export async function claimTask(config: MissionControlConfig, taskId: number): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = `${config.url}/api/tasks/${taskId}/claim`;
    const response = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(config.pollTimeoutMs ?? 5000),
    });

    if (!response.ok) {
      log.warn("MC claim task failed", { status: response.status, taskId });
      return false;
    }

    return true;
  } catch (error) {
    log.warn("MC claim task error", {
      error: error instanceof Error ? error.message : String(error),
      taskId,
    });
    return false;
  }
}

/**
 * Add a comment to a task
 */
export async function addTaskComment(
  config: MissionControlConfig,
  taskId: number,
  content: string
): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = `${config.url}/api/tasks/${taskId}/comments`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agentId: config.agentId,
        content,
      }),
      signal: AbortSignal.timeout(config.pollTimeoutMs ?? 5000),
    });

    if (!response.ok) {
      log.warn("MC add comment failed", { status: response.status, taskId });
      return false;
    }

    return true;
  } catch (error) {
    log.warn("MC add comment error", {
      error: error instanceof Error ? error.message : String(error),
      taskId,
    });
    return false;
  }
}

/**
 * Poll Mission Control for activity and log it
 * This is called as part of the heartbeat routine
 */
export async function pollMissionControlActivity(config: MissionControlConfig): Promise<void> {
  if (!config.enabled) return;

  try {
    const notifications = await fetchNotifications(config);
    if (notifications && (notifications.unreadMessages > 0 || notifications.pendingTasks > 0)) {
      log.info("MC activity detected", {
        agentId: config.agentId,
        unreadMessages: notifications.unreadMessages,
        pendingTasks: notifications.pendingTasks,
      });
    }
  } catch (error) {
    log.warn("MC activity poll error", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
