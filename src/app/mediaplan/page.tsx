import React from 'react';
import { getMediaPlanSettings } from '@/app/actions';
import MediaPlanDashboard from '@/components/MediaPlanDashboard';

export const revalidate = 0; // Disable server caching to ensure real-time database updates

export default async function MediaPlanPage() {
  const result = await getMediaPlanSettings();
  
  let initialCalcData = null;
  let initialPlanData = null;

  if (result.success && result.data) {
    initialCalcData = result.data.calc_data;
    initialPlanData = result.data.plan_data;
  }

  return (
    <MediaPlanDashboard 
      initialCalcData={initialCalcData} 
      initialPlanData={initialPlanData} 
    />
  );
}
