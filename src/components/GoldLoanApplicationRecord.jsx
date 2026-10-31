'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import AppShell from './AppShell';
import Card from './Card';
import PageHeader from './PageHeader';
import {
  GoldLoanApplicationView,
  LoanApplicationFormPage,
  getApplicationId,
  isGoldLoanApplication,
  persistGoldLoanApplication,
  readSavedGoldLoanApplications,
} from './GoldLoanApplication';
import { api } from '../services/api';

export default function GoldLoanApplicationRecord({ id, mode }) {
  const router = useRouter();
  const [application, setApplication] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const dashboardPath = '/gold_loan_application';

  useEffect(() => {
    setLoaded(false);
    setApplication(null);
    setLoadError('');
    try {
      const savedApplications = readSavedGoldLoanApplications();
      const savedById = new Map(
        savedApplications.map((record) => [getApplicationId(record), record]),
      );
      const records = (Array.isArray(api.applications) ? api.applications : [])
        .map((record) => ({
          ...record,
          ...(savedById.get(getApplicationId(record)) || {}),
        }));
      const recordIds = new Set(records.map(getApplicationId));
      records.push(...savedApplications.filter((record) => !recordIds.has(getApplicationId(record))));

      const match = records.find(
        (record) => getApplicationId(record) === id && isGoldLoanApplication(record),
      );
      setApplication(match || null);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? `Saved Gold Loan applications could not be loaded: ${error.message}`
          : 'Saved Gold Loan applications could not be loaded from this browser.',
      );
    } finally {
      setLoaded(true);
    }
  }, [id]);

  const returnToDashboard = () => router.push(dashboardPath);

  const saveApplication = (updatedApplication) => {
    persistGoldLoanApplication(updatedApplication);
    setApplication((current) => ({ ...current, ...updatedApplication }));
  };

  if (!loaded) {
    return (
      <AppShell title="Gold Loan Application">
        <Card className="gold-application-message">
          <p>Loading application details...</p>
        </Card>
      </AppShell>
    );
  }

  if (loadError || !application) {
    return (
      <AppShell title="Gold Loan Application">
        <PageHeader
          title={loadError ? 'Unable to Load Application' : 'Gold Loan Application Not Found'}
          action={(
            <button
              className="icon-button loan-dashboard-back"
              type="button"
              onClick={returnToDashboard}
              aria-label="Back to Gold Loan Dashboard"
              title="Back to Gold Loan Dashboard"
            >
              <ArrowLeft size={19} aria-hidden="true" />
            </button>
          )}
        />
        <Card className="gold-application-message">
          <p>{loadError || 'The requested Gold Loan application could not be found.'}</p>
          <button className="loan-secondary-btn" type="button" onClick={returnToDashboard}>
            <ArrowLeft size={16} aria-hidden="true" />
            Return to Gold Loan Dashboard
          </button>
        </Card>
      </AppShell>
    );
  }

  if (mode === 'view') {
    return (
      <GoldLoanApplicationView
        application={application}
        onBack={returnToDashboard}
        backLabel="Gold Loan Dashboard"
      />
    );
  }

  return (
    <LoanApplicationFormPage
      key={id}
      application={application}
      onBack={returnToDashboard}
      onSave={saveApplication}
      backLabel="Gold Loan Dashboard"
    />
  );
}
