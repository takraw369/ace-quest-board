import CalibrationClient from '@/components/calibration/CalibrationClient';
import CalibrationReturnLink from '@/components/onboarding/CalibrationReturnLink';

export default function CalibrationPage() {
  return (
    <>
      <CalibrationReturnLink />
      <CalibrationClient />
    </>
  );
}
