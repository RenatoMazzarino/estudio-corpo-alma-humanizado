export type BlockType = "shift" | "personal" | "vacation" | "administrative";

export interface AvailabilityBlock {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  block_type?: BlockType | string | null;
  is_full_day?: boolean | null;
  reason?: string | null;
}

export interface MonthOverview {
  blocks: AvailabilityBlock[];
  appointments: { id: string; start_time: string; service_name: string; is_home_visit?: boolean | null }[];
}

export interface CreateBlockPayload {
  date: string;
  title: string;
  blockType: BlockType;
  fullDay: boolean;
  startTime?: string;
  endTime?: string;
  force?: boolean;
}
