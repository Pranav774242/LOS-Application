'use client';

import { useParams } from 'next/navigation';
import GoldLoanApplicationRecord from '../../../../components/GoldLoanApplicationRecord';

export default function EditGoldLoanApplicationPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  return <GoldLoanApplicationRecord id={id} mode="edit" />;
}
