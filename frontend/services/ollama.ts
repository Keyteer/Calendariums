import { apiPost } from "./api";

export interface ScheduleSuggestion {
    start_datetime: string;
    end_datetime: string;
    reason: string;
}

export async function getScheduleSuggestion(userId: string, description: string, duration?: number) {
    return await apiPost("/ollama/suggest", { userId, description, duration });
}

export async function getGroupScheduleSuggestion(userIds: string[], description: string, duration?: number) {
    return await apiPost("/ollama/group-suggest", { userIds, description, duration });
}
